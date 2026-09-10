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
