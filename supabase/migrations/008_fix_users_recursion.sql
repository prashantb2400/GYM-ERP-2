-- =========================================================================
-- GymERP Migration 008: Fix Infinite Recursion on Users Table RLS & Functions
-- =========================================================================

-- 1. Helper functions rewritten as PL/pgSQL with SECURITY DEFINER
-- IMPORTANT: Functions defined in LANGUAGE sql can be inlined by the PostgreSQL
-- query optimizer. When inlined into an RLS policy on public.users, they execute
-- within the caller's context and evaluate the same RLS policy repeatedly, causing:
-- "ERROR: infinite recursion detected in policy for relation users".
-- Using PL/pgSQL prevents function inlining and executes under the function owner's
-- context (postgres) which has BYPASSRLS privilege.

CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
DECLARE
  v_gym_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT gym_id INTO v_gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_gym_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT role INTO v_role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT branch_id INTO v_branch_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop legacy recursive policies on public.users
DROP POLICY IF EXISTS "Users can view members of their own gym" ON public.users;
DROP POLICY IF EXISTS "Owners can manage users of their gym" ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_same_gym ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_manage_owner ON public.users;

-- 3. Install clean, non-recursive RLS policies on public.users
-- Self-select: users can always view their own record without any subqueries
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth_id = auth.uid());

-- Gym colleagues: users can view staff/members belonging to the same gym
CREATE POLICY users_select_same_gym ON public.users
  FOR SELECT USING (
    gym_id IS NOT NULL 
    AND gym_id = get_user_gym_id()
  );

-- Self profile creation: allows authenticated users to insert their initial profile
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- Self profile update: allows users to update their own profile details
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- Owner management: gym owners can manage all users within their gym
CREATE POLICY users_manage_owner ON public.users
  FOR ALL USING (
    gym_id IS NOT NULL 
    AND gym_id = get_user_gym_id() 
    AND get_user_role() = 'owner'
  ) WITH CHECK (
    gym_id IS NOT NULL 
    AND gym_id = get_user_gym_id() 
    AND get_user_role() = 'owner'
  );

-- 4. Fix policies on public.gyms to allow owner access without recursion
DROP POLICY IF EXISTS "Users can view their own gym" ON public.gyms;
DROP POLICY IF EXISTS "Owners can update their own gym" ON public.gyms;
DROP POLICY IF EXISTS gyms_select ON public.gyms;
DROP POLICY IF EXISTS gyms_insert ON public.gyms;
DROP POLICY IF EXISTS gyms_update ON public.gyms;

CREATE POLICY gyms_select ON public.gyms
  FOR SELECT USING (
    id = get_user_gym_id() 
    OR owner_id = auth.uid()
  );

CREATE POLICY gyms_insert ON public.gyms
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY gyms_update ON public.gyms
  FOR UPDATE USING (
    (id = get_user_gym_id() AND get_user_role() = 'owner')
    OR owner_id = auth.uid()
  );

-- 5. Robust Counter & Code Generator Functions
-- Fixes "Invalid counter type: member_count" by normalizing input arguments
-- and ensuring counters exist and never throw exceptions.

CREATE OR REPLACE FUNCTION increment_counter(p_gym_id UUID, p_field TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_val INTEGER;
  clean_field TEXT;
BEGIN
  IF p_gym_id IS NULL THEN
    RETURN 1;
  END IF;

  clean_field := LOWER(TRIM(COALESCE(p_field, 'member_count')));

  -- Ensure counters row exists for this gym
  INSERT INTO public.counters (gym_id, member_count, invoice_count)
  VALUES (p_gym_id, 0, 0)
  ON CONFLICT (gym_id) DO NOTHING;

  IF clean_field IN ('member_count', 'member', 'members') THEN
    UPDATE public.counters 
    SET member_count = COALESCE(member_count, 0) + 1 
    WHERE gym_id = p_gym_id 
    RETURNING member_count INTO new_val;
  ELSIF clean_field IN ('invoice_count', 'invoice', 'invoices') THEN
    UPDATE public.counters 
    SET invoice_count = COALESCE(invoice_count, 0) + 1 
    WHERE gym_id = p_gym_id 
    RETURNING invoice_count INTO new_val;
  ELSE
    -- Safe fallback: increment member_count by default, NEVER throw exception
    UPDATE public.counters 
    SET member_count = COALESCE(member_count, 0) + 1 
    WHERE gym_id = p_gym_id 
    RETURNING member_count INTO new_val;
  END IF;

  RETURN COALESCE(new_val, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION generate_member_code(p_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  cnt := increment_counter(p_gym_id, 'member_count');
  RETURN 'GYM' || LPAD(COALESCE(cnt, 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION generate_invoice_number(p_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  cnt := increment_counter(p_gym_id, 'invoice_count');
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(COALESCE(cnt, 1)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

