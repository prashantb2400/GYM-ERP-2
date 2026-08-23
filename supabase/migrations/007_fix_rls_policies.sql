-- ============================================================================
-- Migration 007: Fix Dangerous RLS Policies (S0-5)
-- Closes multi-tenant privilege escalation, cross-gym access, and counter
-- manipulation vulnerabilities identified in the market-ready audit.
-- ============================================================================

-- ── 1. GYMS TABLE ────────────────────────────────────────────────────────────

-- FIX: INSERT should only allow authenticated users to create a gym where
-- they are explicitly the owner. Removes the broad "any authenticated user" bypass.
DROP POLICY IF EXISTS "Authenticated users can create gym" ON public.gyms;
CREATE POLICY "Owners can create their own gym" ON public.gyms
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- FIX: SELECT — allow owners to see their gym OR users who belong to this gym
DROP POLICY IF EXISTS "Owners can view their own gym" ON public.gyms;
DROP POLICY IF EXISTS "Users can view their gym" ON public.gyms;
CREATE POLICY "Gym members can view their gym" ON public.gyms
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- FIX: UPDATE — only the actual owner of the gym can update it
DROP POLICY IF EXISTS "Owners can update their own gym" ON public.gyms;
CREATE POLICY "Only gym owner can update their gym" ON public.gyms
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- FIX: DELETE — only the actual owner can delete their gym
DROP POLICY IF EXISTS "Owners can delete their own gym" ON public.gyms;
CREATE POLICY "Only gym owner can delete their gym" ON public.gyms
  FOR DELETE
  USING (owner_id = auth.uid());


-- ── 2. USERS TABLE ───────────────────────────────────────────────────────────

-- FIX: SELECT — gym members can see users in their gym; users can see themselves
DROP POLICY IF EXISTS "Users can view members of their own gym" ON public.users;
CREATE POLICY "Users can view their own gym users" ON public.users
  FOR SELECT
  USING (
    auth_id = auth.uid()
    OR gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- FIX: INSERT — only link to your own auth_id; gym_id validated separately
DROP POLICY IF EXISTS "Authenticated users can insert user profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- FIX: UPDATE — users can update their own record; owners can update gym staff
DROP POLICY IF EXISTS "Owners can manage users of their gym" ON public.users;
CREATE POLICY "Owners can update gym staff" ON public.users
  FOR UPDATE
  USING (
    auth_id = auth.uid()
    OR (
      gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() AND role = 'owner' LIMIT 1)
    )
  );

-- FIX: DELETE — only owners can remove staff from their own gym; cannot delete the owner record
DROP POLICY IF EXISTS "Owners can delete gym users" ON public.users;
CREATE POLICY "Owners can delete gym staff" ON public.users
  FOR DELETE
  USING (
    gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() AND role = 'owner' LIMIT 1)
    AND role <> 'owner' -- Prevent owners from accidentally deleting themselves
  );


-- ── 3. COUNTERS TABLE ────────────────────────────────────────────────────────

-- FIX: Restrict counter access to the gym it belongs to — prevent cross-gym counter manipulation
DROP POLICY IF EXISTS "Authenticated users can read counters" ON public.counters;
DROP POLICY IF EXISTS "Authenticated users can manage counters" ON public.counters;
DROP POLICY IF EXISTS "Owners can manage counters" ON public.counters;

CREATE POLICY "Gym users can read their own counters" ON public.counters
  FOR SELECT
  USING (
    gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "Gym users can insert their own counters" ON public.counters
  FOR INSERT
  WITH CHECK (
    gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Gym users can update their own counters" ON public.counters
  FOR UPDATE
  USING (
    gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );


-- ── 4. PLATFORM_SUBSCRIPTIONS TABLE ─────────────────────────────────────────

-- FIX: Any authenticated user could self-grant Enterprise tier
DROP POLICY IF EXISTS "Authenticated users can insert platform subscriptions" ON public.platform_subscriptions;

-- Only service role (backend) and super_admins can insert platform subscriptions
-- Regular users can only read their own gym's subscription
CREATE POLICY "Gym owners can view their platform subscription" ON public.platform_subscriptions
  FOR SELECT
  USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
    OR gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- No client-side INSERT allowed — subscriptions are only created by backend/superadmin via service role
-- (The existing policies should be dropped; INSERT via client is prohibited)
DROP POLICY IF EXISTS "Owners can create platform subscriptions" ON public.platform_subscriptions;


-- ── 5. SUBSCRIPTIONS TABLE ───────────────────────────────────────────────────

-- Restrict plan subscriptions to the gym they belong to
DROP POLICY IF EXISTS "Authenticated users can insert subscriptions" ON public.subscriptions;
CREATE POLICY "Gym users can insert gym subscriptions" ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    gym_id = (SELECT gym_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
    OR gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );


-- ── 6. INVOICES — Prevent cascade delete destroying financial history ─────────
-- Change member_id FK from CASCADE to SET NULL to preserve invoice history

-- Note: FK constraints cannot be modified in-place; we must recreate them.
-- This does NOT delete existing data — it only changes future delete behavior.
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_member_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES public.members(id)
  ON DELETE SET NULL;


-- ── 7. Soft-delete columns for critical tables ───────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
