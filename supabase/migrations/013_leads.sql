-- =========================================================================
-- GymERP Migration 013: Leads Management Table & RLS Policies
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT DEFAULT 'membership' CHECK (interest IN ('membership', 'personal_training', 'group_class', 'other')),
  source TEXT DEFAULT 'walk_in' CHECK (source IN ('walk_in', 'referral', 'instagram', 'google', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'converted', 'lost')),
  notes TEXT,
  follow_up_date DATE,
  converted_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for high-performance CRM filtering
CREATE INDEX IF NOT EXISTS idx_leads_gym_id ON public.leads(gym_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Auto-update updated_at timestamp trigger
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Scoped by gym membership
DROP POLICY IF EXISTS leads_select ON public.leads;
CREATE POLICY leads_select ON public.leads
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- 2. INSERT Policy: Staff and Owners of this gym
DROP POLICY IF EXISTS leads_insert ON public.leads;
CREATE POLICY leads_insert ON public.leads
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- 3. UPDATE Policy
DROP POLICY IF EXISTS leads_update ON public.leads;
CREATE POLICY leads_update ON public.leads
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- 4. DELETE Policy
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_delete ON public.leads
  FOR DELETE USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );
