-- Migration 015: Staff Access Control Hardening
-- Prevents receptionists from deleting invoices, members, and expenses.
-- Prevents floor trainers from viewing invoices and expenses at the database RLS level.

-- ============================================================================
-- 1. INVOICES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS branch_select_invoices ON public.invoices;
DROP POLICY IF EXISTS branch_manage_invoices ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices of their gym" ON public.invoices;
DROP POLICY IF EXISTS "Staff can manage invoices" ON public.invoices;

-- Select: Members see their own invoices; Owners see all; Receptionists see assigned branch
CREATE POLICY branch_select_invoices ON public.invoices
  FOR SELECT USING (
    member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid())
    OR (
      gym_id = get_user_gym_id() AND (
        get_user_role() = 'owner'
        OR (
          get_user_role() = 'receptionist'
          AND (branch_id IS NULL OR branch_id = get_user_branch_id())
        )
      )
    )
  );

-- Insert: Owner or branch receptionist
CREATE POLICY branch_insert_invoices ON public.invoices
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Update: Owner or branch receptionist
CREATE POLICY branch_update_invoices ON public.invoices
  FOR UPDATE USING (
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
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Delete: Strictly gym owner only
CREATE POLICY branch_delete_invoices ON public.invoices
  FOR DELETE USING (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  );

-- ============================================================================
-- 2. MEMBERS POLICIES (Hardening Deletion)
-- ============================================================================
DROP POLICY IF EXISTS branch_manage_members ON public.members;
DROP POLICY IF EXISTS "Staff can manage members" ON public.members;

-- Insert: Owner or branch receptionist
CREATE POLICY branch_insert_members ON public.members
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Update: Owner or branch receptionist
CREATE POLICY branch_update_members ON public.members
  FOR UPDATE USING (
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
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Delete: Strictly gym owner only
CREATE POLICY branch_delete_members ON public.members
  FOR DELETE USING (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  );

-- ============================================================================
-- 3. EXPENSES POLICIES (Hardening Deletion & Trainer Exclusion)
-- ============================================================================
DROP POLICY IF EXISTS branch_select_expenses ON public.expenses;
DROP POLICY IF EXISTS branch_manage_expenses ON public.expenses;
DROP POLICY IF EXISTS "Staff can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Staff can manage expenses" ON public.expenses;

-- Select: Owner or receptionist for their branch (Trainers excluded)
CREATE POLICY branch_select_expenses ON public.expenses
  FOR SELECT USING (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Insert: Owner or receptionist
CREATE POLICY branch_insert_expenses ON public.expenses
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND (
      get_user_role() = 'owner'
      OR (
        get_user_role() = 'receptionist'
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Update: Owner or receptionist
CREATE POLICY branch_update_expenses ON public.expenses
  FOR UPDATE USING (
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
        AND (branch_id IS NULL OR branch_id = get_user_branch_id())
      )
    )
  );

-- Delete: Strictly gym owner only
CREATE POLICY branch_delete_expenses ON public.expenses
  FOR DELETE USING (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  );

-- ============================================================================
-- 4. DUE RECORDS POLICIES (Hardening Deletion)
-- ============================================================================
DROP POLICY IF EXISTS "Staff can view due records" ON public.due_records;
DROP POLICY IF EXISTS "Staff can manage due records" ON public.due_records;

CREATE POLICY "due_records_select" ON public.due_records
  FOR SELECT USING (
    gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist')
  );

CREATE POLICY "due_records_insert" ON public.due_records
  FOR INSERT WITH CHECK (
    gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist')
  );

CREATE POLICY "due_records_update" ON public.due_records
  FOR UPDATE USING (
    gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist')
  ) WITH CHECK (
    gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist')
  );

CREATE POLICY "due_records_delete" ON public.due_records
  FOR DELETE USING (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  );
