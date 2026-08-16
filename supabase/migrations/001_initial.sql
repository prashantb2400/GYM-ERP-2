-- 🏋️ GymERP — Supabase Initial Schema Migration
-- Migration: 001_initial.sql
-- Description: Creates all tables, indexes, triggers, functions, and RLS policies for GymERP multi-tenant SaaS.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── HELPER FUNCTIONS ────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get current user's gym_id from users table
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
  SELECT gym_id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get email by login_id for staff authentication
CREATE OR REPLACE FUNCTION get_email_by_login_id(p_login_id TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.users WHERE login_id = p_login_id AND is_active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── TABLES ──────────────────────────────────────────────────

-- 1. Gyms Table
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  whatsapp_business TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  gstin TEXT,
  pan TEXT,
  logo_url TEXT,
  tagline TEXT,
  working_hours JSONB DEFAULT '{"open": "06:00", "close": "22:00"}'::jsonb,
  days_open TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri','Sat'],
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free','pro','enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  is_setup_complete BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{"cctv_enabled": false, "whatsapp_enabled": true, "biometric_enabled": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Users Table (Staff & Owners)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  login_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'receptionist', 'trainer')),
  permissions TEXT[] DEFAULT '{}',
  photo_url TEXT,
  specialization TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Plans Table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  features TEXT[] DEFAULT '{}',
  highlights TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Diet Charts Table
CREATE TABLE public.diet_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_calories INTEGER,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Exercise Charts Table
CREATE TABLE public.exercise_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Members Table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID,
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  email TEXT,
  dob DATE,
  gender TEXT CHECK (gender IN ('male','female','other')),
  blood_group TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pin TEXT,
  photo_url TEXT,
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  current_plan_id UUID REFERENCES public.plans(id),
  plan_start_date DATE,
  plan_end_date DATE,
  admission_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','frozen','cancelled','pending')),
  trainer_id UUID REFERENCES public.users(id),
  diet_chart_id UUID REFERENCES public.diet_charts(id),
  exercise_chart_id UUID REFERENCES public.exercise_charts(id),
  bmi DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  health_goals TEXT[] DEFAULT '{}',
  fitness_level TEXT CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  medical_conditions TEXT,
  timing_slot TEXT,
  has_locker BOOLEAN DEFAULT false,
  locker_number TEXT,
  total_due DECIMAL(10,2) DEFAULT 0,
  total_paid_lifetime DECIMAL(10,2) DEFAULT 0,
  last_attendance TIMESTAMPTZ,
  attendance_count INTEGER DEFAULT 0,
  face_enrolled BOOLEAN DEFAULT false,
  biometric_enrolled BOOLEAN DEFAULT false,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
  birthday_notified_year INTEGER,
  anniversary_notified_year INTEGER,
  review_request_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Invoices Table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  cgst_amount DECIMAL(10,2) DEFAULT 0,
  sgst_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) DEFAULT 0,
  payment_mode TEXT CHECK (payment_mode IN ('cash','upi','card','bank_transfer','online')),
  transaction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid','partial','pending')),
  issued_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  sent_via_whatsapp BOOLEAN DEFAULT false,
  pdf_url TEXT,
  created_by UUID REFERENCES public.users(id)
);

-- 8. Attendance Table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('manual','face_recognition','fingerprint')),
  device_id TEXT,
  device_name TEXT,
  confidence DECIMAL(4,3),
  snapshot_url TEXT,
  marked_by UUID REFERENCES public.users(id),
  notes TEXT,
  UNIQUE(gym_id, member_id, date)
);

-- 9. Follow-ups Table
CREATE TABLE public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  member_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inactive','renewal','due','general','new_lead')),
  scheduled_date DATE NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','completed','missed','cancelled')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.users(id)
);

-- 10. Due Records Table
CREATE TABLE public.due_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  collected_amount DECIMAL(10,2) DEFAULT 0,
  payment_mode TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','collected')),
  due_date DATE,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. KYC Documents Table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar','pan','driving_license','passport','other')),
  document_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_by UUID REFERENCES public.users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 12. WhatsApp Logs Table
CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('text','template','document')),
  template_name TEXT,
  document_type TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
  wa_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Cron Logs Table
CREATE TABLE public.cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  job_name TEXT NOT NULL,
  members_notified INTEGER DEFAULT 0,
  channel TEXT,
  status TEXT CHECK (status IN ('success','failed','partial')),
  duration_ms INTEGER,
  error TEXT,
  run_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Counters Table (Auto-increment tracking)
CREATE TABLE public.counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE NOT NULL,
  member_count INTEGER DEFAULT 0,
  invoice_count INTEGER DEFAULT 0
);

-- 15. Subscriptions Table (SaaS Tiers)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
  max_members INTEGER DEFAULT 50,
  features JSONB DEFAULT '{"cctv": false, "wa_broadcast": false, "analytics_export": false}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  payment_id TEXT,
  is_active BOOLEAN DEFAULT true
);

-- ─── INDEXES ─────────────────────────────────────────────────

CREATE INDEX idx_users_gym_id ON public.users(gym_id);
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_role ON public.users(gym_id, role);

CREATE INDEX idx_members_gym_id ON public.members(gym_id);
CREATE INDEX idx_members_status ON public.members(gym_id, status);
CREATE INDEX idx_members_plan_end ON public.members(gym_id, status, plan_end_date);
CREATE INDEX idx_members_trainer ON public.members(gym_id, trainer_id);
CREATE INDEX idx_members_due ON public.members(gym_id, status, total_due);
CREATE INDEX idx_members_attendance ON public.members(gym_id, status, last_attendance);
CREATE INDEX idx_members_phone ON public.members(gym_id, phone);
CREATE INDEX idx_members_code ON public.members(gym_id, member_code);

CREATE INDEX idx_plans_gym_id ON public.plans(gym_id);

CREATE INDEX idx_invoices_gym_id ON public.invoices(gym_id);
CREATE INDEX idx_invoices_member ON public.invoices(gym_id, member_id);
CREATE INDEX idx_invoices_status ON public.invoices(gym_id, status);
CREATE INDEX idx_invoices_number ON public.invoices(gym_id, invoice_number);

CREATE INDEX idx_attendance_gym_date ON public.attendance(gym_id, date);
CREATE INDEX idx_attendance_member_date ON public.attendance(member_id, date);
CREATE INDEX idx_attendance_method ON public.attendance(gym_id, date, method);

CREATE INDEX idx_followups_gym_status ON public.followups(gym_id, status);
CREATE INDEX idx_followups_scheduled ON public.followups(gym_id, status, scheduled_date);

CREATE INDEX idx_due_records_gym ON public.due_records(gym_id, status);
CREATE INDEX idx_due_records_member ON public.due_records(gym_id, member_id);

CREATE INDEX idx_whatsapp_logs_gym ON public.whatsapp_logs(gym_id);
CREATE INDEX idx_whatsapp_logs_member ON public.whatsapp_logs(gym_id, member_id);

CREATE INDEX idx_cron_logs_gym ON public.cron_logs(gym_id);
CREATE INDEX idx_kyc_member ON public.kyc_documents(gym_id, member_id);

-- ─── TRIGGERS FOR UPDATED_AT ───────────────────────────────

CREATE TRIGGER trigger_update_gyms BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_plans BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_diet_charts BEFORE UPDATE ON public.diet_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_exercise_charts BEFORE UPDATE ON public.exercise_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trigger_update_members BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── INCREMENT AND CODE GENERATORS ─────────────────────────

-- Increment counter and return new value
CREATE OR REPLACE FUNCTION increment_counter(p_gym_id UUID, p_field TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_val INTEGER;
BEGIN
  -- Insert counter if it doesn't exist yet
  INSERT INTO public.counters (gym_id, member_count, invoice_count)
  VALUES (p_gym_id, 0, 0)
  ON CONFLICT (gym_id) DO NOTHING;

  IF p_field = 'member_count' THEN
    UPDATE public.counters SET member_count = member_count + 1 WHERE gym_id = p_gym_id RETURNING member_count INTO new_val;
  ELSIF p_field = 'invoice_count' THEN
    UPDATE public.counters SET invoice_count = invoice_count + 1 WHERE gym_id = p_gym_id RETURNING invoice_count INTO new_val;
  END IF;
  RETURN new_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate member code like GYM0001
CREATE OR REPLACE FUNCTION generate_member_code(p_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  cnt := increment_counter(p_gym_id, 'member_count');
  RETURN 'GYM' || LPAD(cnt::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate invoice number like INV-2026-0001
CREATE OR REPLACE FUNCTION generate_invoice_number(p_gym_id UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  cnt := increment_counter(p_gym_id, 'invoice_count');
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(cnt::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── ROW LEVEL SECURITY (RLS) policies ─────────────────────

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Gyms policies
CREATE POLICY "Users can view their own gym" ON public.gyms
  FOR SELECT USING (id = get_user_gym_id());
CREATE POLICY "Owners can update their own gym" ON public.gyms
  FOR UPDATE USING (id = get_user_gym_id() AND get_user_role() = 'owner');

-- 2. Users policies
CREATE POLICY "Users can view members of their own gym" ON public.users
  FOR SELECT USING (gym_id = get_user_gym_id() OR auth_id = auth.uid());
CREATE POLICY "Owners can manage users of their gym" ON public.users
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner');

-- 3. Plans policies
CREATE POLICY "Anyone can view plans of their gym" ON public.plans
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Owners can manage plans of their gym" ON public.plans
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner');

-- 4. Diet Charts policies
CREATE POLICY "Users can view diet charts" ON public.diet_charts
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Staff can manage diet charts" ON public.diet_charts
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'trainer'));

-- 5. Exercise Charts policies
CREATE POLICY "Users can view exercise charts" ON public.exercise_charts
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Staff can manage exercise charts" ON public.exercise_charts
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'trainer'));

-- 6. Members policies
CREATE POLICY "Users can view members of their gym" ON public.members
  FOR SELECT USING (gym_id = get_user_gym_id() OR auth_id = auth.uid());
CREATE POLICY "Staff can manage members" ON public.members
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

-- 7. Invoices policies
CREATE POLICY "Users can view invoices of their gym" ON public.invoices
  FOR SELECT USING (gym_id = get_user_gym_id() OR member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid()));
CREATE POLICY "Staff can manage invoices" ON public.invoices
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

-- 8. Attendance policies
CREATE POLICY "Users can view attendance of their gym" ON public.attendance
  FOR SELECT USING (gym_id = get_user_gym_id() OR member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid()));
CREATE POLICY "Staff can manage attendance" ON public.attendance
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist', 'trainer'));

-- 9. Followups policies
CREATE POLICY "Staff can view followups" ON public.followups
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Staff can manage followups" ON public.followups
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

-- 10. Due Records policies
CREATE POLICY "Staff can view due records" ON public.due_records
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Staff can manage due records" ON public.due_records
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

-- 11. KYC Documents policies
CREATE POLICY "Users can view KYC of their gym" ON public.kyc_documents
  FOR SELECT USING (gym_id = get_user_gym_id() OR member_id = (SELECT id FROM public.members WHERE auth_id = auth.uid()));
CREATE POLICY "Staff can manage KYC" ON public.kyc_documents
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() IN ('owner', 'receptionist'));

-- 12. WhatsApp Logs policies
CREATE POLICY "Staff can view WhatsApp logs" ON public.whatsapp_logs
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "System can log WhatsApp" ON public.whatsapp_logs
  FOR INSERT WITH CHECK (gym_id = get_user_gym_id());

-- 13. Cron Logs policies
CREATE POLICY "Staff can view cron logs" ON public.cron_logs
  FOR SELECT USING (gym_id = get_user_gym_id());

-- 14. Counters policies
CREATE POLICY "Internal service can read/write counters" ON public.counters
  FOR ALL USING (gym_id = get_user_gym_id());

-- 15. Subscriptions policies
CREATE POLICY "Gym can view subscription" ON public.subscriptions
  FOR SELECT USING (gym_id = get_user_gym_id());
