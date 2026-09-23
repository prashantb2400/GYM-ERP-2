-- =========================================================================
-- GymERP Migration 019: Scope Staff RLS Policy to Same Tenant
-- Eliminates cross-tenant staff data discovery while preserving non-recursive architecture.
-- =========================================================================

DROP POLICY IF EXISTS users_select_staff ON public.users;

-- Staff & Trainers: Authenticated members and owners can only view staff profiles within their own gym.
-- Queries gyms (for owners) and members (for members), completely avoiding circular recursion on users.
CREATE POLICY users_select_staff ON public.users
  FOR SELECT USING (
    role IN ('trainer', 'receptionist', 'owner')
    AND (
      gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
      OR gym_id IN (SELECT gym_id FROM public.members WHERE auth_id = auth.uid())
    )
  );
