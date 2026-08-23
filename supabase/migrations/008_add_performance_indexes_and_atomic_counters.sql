-- ============================================================================
-- Migration 008: Performance Indexes, FK Fixes & Atomic Counters (Sprint 2: M-6, M-7, M-19)
-- ============================================================================

-- ── 1. PERFORMANCE INDEXES (M-6) ─────────────────────────────────────────────

-- Members lookups
CREATE INDEX IF NOT EXISTS idx_members_gym_status ON public.members (gym_id, status);
CREATE INDEX IF NOT EXISTS idx_members_gym_plan_end ON public.members (gym_id, plan_end_date);
CREATE INDEX IF NOT EXISTS idx_members_gym_phone ON public.members (gym_id, phone);
CREATE INDEX IF NOT EXISTS idx_members_auth_id ON public.members (auth_id) WHERE auth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_gym_deleted ON public.members (gym_id) WHERE deleted_at IS NULL;

-- Attendance lookups & reporting
CREATE INDEX IF NOT EXISTS idx_attendance_gym_date ON public.attendance (gym_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_member_date ON public.attendance (member_id, date);

-- Invoices & Financial reporting
CREATE INDEX IF NOT EXISTS idx_invoices_gym_issued ON public.invoices (gym_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_member_id ON public.invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (gym_id, status);

-- Users & Auth lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_gym_role ON public.users (gym_id, role);

-- Platform subscriptions & gyms
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_gym ON public.platform_subscriptions (gym_id);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id ON public.gyms (owner_id);

-- WhatsApp logs & Cron logs
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_gym_created ON public.whatsapp_logs (gym_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_run ON public.cron_logs (job_name, run_at);

-- Payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_tx_order ON public.payment_transactions (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_payment ON public.payment_transactions (razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_member ON public.payment_transactions (member_id);


-- ── 2. FOREIGN KEY NULLIFICATION (M-7) ───────────────────────────────────────

-- Ensure deleting a plan doesn't delete past member records (set current_plan_id to NULL)
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_current_plan_id_fkey;

ALTER TABLE public.members
  ADD CONSTRAINT members_current_plan_id_fkey
  FOREIGN KEY (current_plan_id)
  REFERENCES public.plans(id)
  ON DELETE SET NULL;

-- Ensure deleting an assigned trainer from users doesn't crash members
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'trainer_id'
  ) THEN
    ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_trainer_id_fkey;
    ALTER TABLE public.members ADD CONSTRAINT members_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;


-- ── 3. ATOMIC COUNTERS RPC (M-19) ────────────────────────────────────────────

-- Prevents race conditions when concurrent member registrations or invoices occur.
CREATE OR REPLACE FUNCTION public.increment_counter(
  p_gym_id UUID,
  p_counter_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_val INTEGER;
BEGIN
  IF p_counter_type = 'member' THEN
    INSERT INTO public.counters (gym_id, member_count, invoice_count)
    VALUES (p_gym_id, 1, 0)
    ON CONFLICT (gym_id)
    DO UPDATE SET member_count = public.counters.member_count + 1
    RETURNING member_count INTO v_new_val;
  ELSIF p_counter_type = 'invoice' THEN
    INSERT INTO public.counters (gym_id, member_count, invoice_count)
    VALUES (p_gym_id, 0, 1)
    ON CONFLICT (gym_id)
    DO UPDATE SET invoice_count = public.counters.invoice_count + 1
    RETURNING invoice_count INTO v_new_val;
  ELSE
    RAISE EXCEPTION 'Invalid counter type: %', p_counter_type;
  END IF;

  RETURN v_new_val;
END;
$$;
