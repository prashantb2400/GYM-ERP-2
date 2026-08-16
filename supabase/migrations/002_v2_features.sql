-- =========================================================================
-- GymERP v2 Migration: Multi-Branch & Business Ops Tables
-- =========================================================================

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Apply auto-updated_at trigger
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Backfill existing gyms with a Default Branch so existing data remains safe
INSERT INTO public.branches (gym_id, name, is_active)
SELECT id, name || ' Main Branch', true FROM public.gyms
ON CONFLICT DO NOTHING;

-- 3. Modify Users & Members to associate with a branch
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.members 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Automatically assign existing users/members to the first branch of their gym
UPDATE public.users u
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = u.gym_id LIMIT 1)
WHERE branch_id IS NULL;

UPDATE public.members m
SET branch_id = (SELECT id FROM public.branches b WHERE b.gym_id = m.gym_id LIMIT 1)
WHERE branch_id IS NULL;

-- 4. Create Business Operations Tables

-- Expense tracking table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- Rent, Salaries, Electricity, Equipment, Marketing, Other
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT CHECK (payment_mode IN ('cash', 'upi', 'card', 'bank_transfer')),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT, -- Supplements, Merchandise, Drinks, Accessories
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale', 'adjustment')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Razorpay transactions log table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  razorpay_signature TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('created', 'authorized', 'captured', 'refunded', 'failed')),
  error_code TEXT,
  error_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Row Level Security (RLS) & Policies

-- Enable RLS on new tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY select_branches ON public.branches
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY select_expenses ON public.expenses
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY select_inventory ON public.inventory
  FOR SELECT USING (gym_id = get_user_gym_id());

CREATE POLICY select_inventory_tx ON public.inventory_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inventory i 
      WHERE i.id = inventory_transactions.inventory_id 
      AND i.gym_id = get_user_gym_id()
    )
  );

CREATE POLICY select_payment_tx ON public.payment_transactions
  FOR SELECT USING (gym_id = get_user_gym_id());

-- Write (Insert/Update/Delete) policies - Restricted by role
-- Branches: Owner only
CREATE POLICY modify_branches ON public.branches
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner');

-- Expenses: Owner and Receptionist can insert/update, only Owner can delete
CREATE POLICY insert_expenses ON public.expenses
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

CREATE POLICY update_expenses ON public.expenses
  FOR UPDATE USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

CREATE POLICY delete_expenses ON public.expenses
  FOR DELETE USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner');

-- Inventory: Owner and Receptionist can insert/update
CREATE POLICY insert_inventory ON public.inventory
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

CREATE POLICY update_inventory ON public.inventory
  FOR UPDATE USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

CREATE POLICY delete_inventory ON public.inventory
  FOR DELETE USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner');

-- Inventory Transactions: Insert only on inventory items belonging to gym
CREATE POLICY insert_inventory_tx ON public.inventory_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory i 
      WHERE i.id = inventory_transactions.inventory_id 
      AND i.gym_id = get_user_gym_id()
    )
  );

-- Payment Transactions: Can be written by system/receptionist
CREATE POLICY write_payment_tx ON public.payment_transactions
  FOR ALL USING (gym_id = get_user_gym_id());

-- 6. Refine existing RLS policies to enforce branch isolation for staff
-- Note: A staff member (receptionist/trainer) should only query data belonging to their assigned branch.
-- An owner can view all branches (since their branch_id might be null or they have administrative bypass).

DROP POLICY IF EXISTS select_members ON public.members;
CREATE POLICY select_members ON public.members
  FOR SELECT USING (
    gym_id = get_user_gym_id() 
    AND (
      get_user_role() = 'owner' 
      OR branch_id = (SELECT branch_id FROM public.users WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS select_attendance ON public.attendance;
CREATE POLICY select_attendance ON public.attendance
  FOR SELECT USING (
    gym_id = get_user_gym_id() 
    AND (
      get_user_role() = 'owner' 
      OR EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = attendance.member_id 
        AND m.branch_id = (SELECT branch_id FROM public.users WHERE auth_id = auth.uid())
      )
    )
  );
