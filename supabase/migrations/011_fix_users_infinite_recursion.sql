-- =========================================================================
-- GymERP Migration 011: Complete Elimination of Infinite Recursion on Users Table
-- =========================================================================

-- 1. Drop all prior recursive policies on public.users
DROP POLICY IF EXISTS "Users can view members of their own gym" ON public.users;
DROP POLICY IF EXISTS "Owners can manage users of their gym" ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_same_gym ON public.users;
DROP POLICY IF EXISTS users_select_owner ON public.users;
DROP POLICY IF EXISTS users_select_staff ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_manage_owner ON public.users;

-- 2. Non-recursive SELECT policies on public.users:
-- Self: Authenticated users can always view their own user row (Zero subqueries)
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth_id = auth.uid());

-- Staff & Trainers: All authenticated users can view staff profiles (trainers, receptionists, owners)
-- This allows member profiles, trainer assignments, and staff dropdowns to load without circular recursion.
CREATE POLICY users_select_staff ON public.users
  FOR SELECT USING (
    role IN ('trainer', 'receptionist', 'owner')
  );

-- Owner: Gym owners can view all users in gyms they own (Queries gyms table, NEVER users table)
CREATE POLICY users_select_owner ON public.users
  FOR SELECT USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

-- 3. Owner management policy (INSERT, UPDATE, DELETE)
-- Scoped through the gyms table, eliminating circular dependency
CREATE POLICY users_manage_owner ON public.users
  FOR ALL USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  ) WITH CHECK (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

-- 4. User self insert and update policies
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- 5. Safe gyms_select policy (Queries only gyms.owner_id and simple users.auth_id)
DROP POLICY IF EXISTS gyms_select ON public.gyms;
DROP POLICY IF EXISTS "Users can view their own gym" ON public.gyms;

CREATE POLICY gyms_select ON public.gyms
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT gym_id FROM public.users WHERE auth_id = auth.uid())
  );

