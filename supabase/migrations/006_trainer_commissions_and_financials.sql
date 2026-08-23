-- Migration 006: Trainer commissions, financial enhancements, and performance indexes

-- 1. Add commission rate to users (staff & trainers are in public.users)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC(5, 2) DEFAULT 0.00;

-- 2. Add trainer reference and commission amount to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS trainer_commission_amount NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Performance Indexes for frequent dashboard queries
CREATE INDEX IF NOT EXISTS idx_attendance_gym_date_member
ON public.attendance(gym_id, date, member_id);

CREATE INDEX IF NOT EXISTS idx_invoices_gym_issued_at
ON public.invoices(gym_id, issued_at);

CREATE INDEX IF NOT EXISTS idx_expenses_gym_date
ON public.expenses(gym_id, date);

CREATE INDEX IF NOT EXISTS idx_members_gym_status
ON public.members(gym_id, status);
