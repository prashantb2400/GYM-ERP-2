-- ============================================================================
-- Migration 004: Platform Subscription Management (Super Admin)
-- ============================================================================

-- 1. platform_plans table (SaaS tiers the platform owner sells)
CREATE TABLE IF NOT EXISTS platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_price INTEGER NOT NULL DEFAULT 0,  -- paise (₹999 = 99900)
  annual_price INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. platform_subscriptions table
CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES platform_plans(id),
  status TEXT NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('active','past_due','canceled','suspended','trialing')),
  billing_cycle TEXT DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  trial_end TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  razorpay_subscription_id TEXT,
  razorpay_customer_id TEXT,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. platform_invoices table
CREATE TABLE IF NOT EXISTS platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES platform_subscriptions(id),
  gym_id UUID NOT NULL REFERENCES gyms(id),
  plan_id UUID REFERENCES platform_plans(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded')),
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin'
    CHECK (role IN ('super_admin','support')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. platform_announcements table
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info'
    CHECK (type IN ('info','warning','maintenance','feature')),
  target_plans TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Alter gyms table to add platform subscription fields
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS platform_plan_id UUID REFERENCES platform_plans(id),
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days');

-- 7. RLS Policies
ALTER TABLE platform_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- 7. Helper Function for Super Admin check
CREATE OR REPLACE FUNCTION public.is_current_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Super admins RLS (non-recursive)
DROP POLICY IF EXISTS "super_admins_full_access_admins" ON super_admins;
DROP POLICY IF EXISTS "super_admins_select_own" ON super_admins;
DROP POLICY IF EXISTS "super_admins_manage_own" ON super_admins;

CREATE POLICY "super_admins_select_own" ON super_admins
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "super_admins_manage_own" ON super_admins
  FOR ALL USING (
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "super_admins_full_access_plans" ON platform_plans;
CREATE POLICY "super_admins_full_access_plans" ON platform_plans
  FOR ALL USING (public.is_current_super_admin());

DROP POLICY IF EXISTS "super_admins_full_access_subs" ON platform_subscriptions;
CREATE POLICY "super_admins_full_access_subs" ON platform_subscriptions
  FOR ALL USING (public.is_current_super_admin());

DROP POLICY IF EXISTS "super_admins_full_access_invoices" ON platform_invoices;
CREATE POLICY "super_admins_full_access_invoices" ON platform_invoices
  FOR ALL USING (public.is_current_super_admin());

DROP POLICY IF EXISTS "super_admins_full_access_announcements" ON platform_announcements;
CREATE POLICY "super_admins_full_access_announcements" ON platform_announcements
  FOR ALL USING (public.is_current_super_admin());

-- Gym owners can read their own subscription and invoices
DROP POLICY IF EXISTS "gym_owners_read_own_subscription" ON platform_subscriptions;
CREATE POLICY "gym_owners_read_own_subscription" ON platform_subscriptions
  FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "gym_owners_read_own_invoices" ON platform_invoices;
CREATE POLICY "gym_owners_read_own_invoices" ON platform_invoices
  FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

-- Anyone can read active plans (for pricing page)
DROP POLICY IF EXISTS "anyone_read_active_plans" ON platform_plans;
CREATE POLICY "anyone_read_active_plans" ON platform_plans
  FOR SELECT USING (is_active = true);

-- Anyone can read active announcements
DROP POLICY IF EXISTS "anyone_read_active_announcements" ON platform_announcements;
CREATE POLICY "anyone_read_active_announcements" ON platform_announcements
  FOR SELECT USING (is_active = true);

-- 8. Seed default plans
INSERT INTO platform_plans (name, slug, description, monthly_price, annual_price, is_active, is_featured, sort_order, features, limits) VALUES
(
  'Free', 'free', 'Get started with basic gym management',
  0, 0, true, false, 1,
  '{"whatsapp_enabled": false, "cctv_enabled": false, "hardware_bridge_enabled": false, "diet_exercise_builder": true, "custom_invoice_branding": false, "crm_followups": false, "analytics_advanced": false, "api_access": false, "white_label": false, "priority_support": false}'::jsonb,
  '{"max_members": 50, "max_staff": 2, "max_whatsapp_messages_per_day": 0, "max_cctv_cameras": 0, "max_storage_gb": 1}'::jsonb
),
(
  'Pro', 'pro', 'Everything you need to run a professional gym',
  99900, 999000, true, true, 2,
  '{"whatsapp_enabled": true, "cctv_enabled": true, "hardware_bridge_enabled": true, "diet_exercise_builder": true, "custom_invoice_branding": true, "crm_followups": true, "analytics_advanced": true, "api_access": false, "white_label": false, "priority_support": false}'::jsonb,
  '{"max_members": 500, "max_staff": 10, "max_whatsapp_messages_per_day": 200, "max_cctv_cameras": 4, "max_storage_gb": 10}'::jsonb
),
(
  'Enterprise', 'enterprise', 'Unlimited scale for multi-branch gym chains',
  249900, 2499000, true, false, 3,
  '{"whatsapp_enabled": true, "cctv_enabled": true, "hardware_bridge_enabled": true, "diet_exercise_builder": true, "custom_invoice_branding": true, "crm_followups": true, "analytics_advanced": true, "api_access": true, "white_label": true, "priority_support": true}'::jsonb,
  '{"max_members": -1, "max_staff": -1, "max_whatsapp_messages_per_day": -1, "max_cctv_cameras": -1, "max_storage_gb": 100}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_platform_subs_gym ON platform_subscriptions(gym_id);
CREATE INDEX IF NOT EXISTS idx_platform_subs_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_gym ON platform_invoices(gym_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_super_admins_user ON super_admins(user_id);
