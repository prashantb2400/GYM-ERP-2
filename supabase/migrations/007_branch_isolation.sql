-- =========================================================================
-- GymERP Migration 007: Multi-Branch Data Isolation & RLS Security Hardening
-- =========================================================================

-- 1. Helper function to retrieve authenticated user's branch_id
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

-- 2. Add branch_id to operational tables that were missing it
ALTER TABLE public.attendance 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- 3. Indexes for branch-filtered queries
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON public.attendance(gym_id, branch_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON public.invoices(gym_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_members_branch ON public.members(gym_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON public.users(gym_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch ON public.expenses(gym_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch ON public.inventory(gym_id, branch_id);

-- 4. Ensure every gym has at least one default branch
INSERT INTO public.branches (gym_id, name, is_active)
SELECT id, name || ' Main Branch', true 
FROM public.gyms g
WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.gym_id = g.id)
ON CONFLICT DO NOTHING;

-- 5. Backfill NULL branch_ids to each gym's primary branch
UPDATE public.users u
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = u.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

UPDATE public.members m
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = m.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

-- Backfill attendance from member assignment where available, fallback to first gym branch
UPDATE public.attendance a
SET branch_id = m.branch_id
FROM public.members m
WHERE a.member_id = m.id AND a.branch_id IS NULL AND m.branch_id IS NOT NULL;

UPDATE public.attendance a
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = a.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

-- Backfill invoices from member assignment where available, fallback to first gym branch
UPDATE public.invoices inv
SET branch_id = m.branch_id
FROM public.members m
WHERE inv.member_id = m.id AND inv.branch_id IS NULL AND m.branch_id IS NOT NULL;

UPDATE public.invoices inv
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = inv.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

UPDATE public.expenses e
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = e.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

UPDATE public.inventory i
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = i.gym_id ORDER BY b.created_at ASC LIMIT 1)
WHERE branch_id IS NULL;

-- 6. DROP ALL legacy permissive policies (including 001 name mismatches)
DROP POLICY IF EXISTS "Users can view members of their gym" ON public.members;
DROP POLICY IF EXISTS "Staff can manage members" ON public.members;
DROP POLICY IF EXISTS "Users can view attendance of their gym" ON public.attendance;
DROP POLICY IF EXISTS "Staff can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can view invoices of their gym" ON public.invoices;
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;

DROP POLICY IF EXISTS select_members ON public.members;
DROP POLICY IF EXISTS select_attendance ON public.attendance;
DROP POLICY IF EXISTS select_expenses ON public.expenses;
DROP POLICY IF EXISTS insert_expenses ON public.expenses;
DROP POLICY IF EXISTS update_expenses ON public.expenses;
DROP POLICY IF EXISTS select_inventory ON public.inventory;
DROP POLICY IF EXISTS insert_inventory ON public.inventory;
DROP POLICY IF EXISTS update_inventory ON public.inventory;

-- Drop previous branch_* policies if re-running
DROP POLICY IF EXISTS branch_select_members ON public.members;
DROP POLICY IF EXISTS branch_manage_members ON public.members;
DROP POLICY IF EXISTS branch_select_attendance ON public.attendance;
DROP POLICY IF EXISTS branch_manage_attendance ON public.attendance;
DROP POLICY IF EXISTS branch_select_invoices ON public.invoices;
DROP POLICY IF EXISTS branch_manage_invoices ON public.invoices;
DROP POLICY IF EXISTS branch_select_expenses ON public.expenses;
DROP POLICY IF EXISTS branch_insert_expenses ON public.expenses;
DROP POLICY IF EXISTS branch_update_expenses ON public.expenses;
DROP POLICY IF EXISTS branch_select_inventory ON public.inventory;
DROP POLICY IF EXISTS branch_insert_inventory ON public.inventory;
DROP POLICY IF EXISTS branch_update_inventory ON public.inventory;

-- 7. RECREATE BRANCH-ISOLATED POLICIES

-- MEMBERS:
-- Members can check in at any branch of their gym.
-- Therefore, all staff of the gym can view (SELECT) members of their gym for
-- check-in verification, kiosk roster matching, and attendance joins.
-- Members can view their own profile.
-- Data modification (INSERT/UPDATE/DELETE) remains strictly branch-isolated via branch_manage_members.
CREATE POLICY branch_select_members ON public.members
  FOR SELECT USING (
    auth_id = auth.uid()
    OR gym_id = get_user_gym_id()
  );

CREATE POLICY branch_manage_members ON public.members
  FOR ALL USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  ) WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );

-- ATTENDANCE:
CREATE POLICY branch_select_attendance ON public.attendance
  FOR SELECT USING (
    member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid())
    OR (
      gym_id = get_user_gym_id() AND (
        get_user_role() = 'owner'
        OR branch_id = get_user_branch_id()
      )
    )
  );

CREATE POLICY branch_manage_attendance ON public.attendance
  FOR ALL USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() IN ('receptionist', 'trainer')
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  ) WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() IN ('receptionist', 'trainer')
        AND branch_id = get_user_branch_id()
      )
    )
  );

-- INVOICES:
CREATE POLICY branch_select_invoices ON public.invoices
  FOR SELECT USING (
    member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid())
    OR (
      gym_id = get_user_gym_id() AND (
        get_user_role() = 'owner'
        OR branch_id = get_user_branch_id()
      )
    )
  );

CREATE POLICY branch_manage_invoices ON public.invoices
  FOR ALL USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  ) WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );

-- EXPENSES:
CREATE POLICY branch_select_expenses ON public.expenses
  FOR SELECT USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR branch_id = get_user_branch_id()
    )
  );

CREATE POLICY branch_insert_expenses ON public.expenses
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );

CREATE POLICY branch_update_expenses ON public.expenses
  FOR UPDATE USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );

-- INVENTORY:
CREATE POLICY branch_select_inventory ON public.inventory
  FOR SELECT USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR branch_id = get_user_branch_id()
    )
  );

CREATE POLICY branch_insert_inventory ON public.inventory
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );

CREATE POLICY branch_update_inventory ON public.inventory
  FOR UPDATE USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND branch_id = get_user_branch_id()
      )
    )
  );
