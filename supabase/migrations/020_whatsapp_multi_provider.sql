-- =========================================================================
-- GymERP Migration 020: WhatsApp Multi-Provider Support & Offline Queue
-- Enables dual-track messaging (Meta Cloud API vs Baileys Local Bridge)
-- =========================================================================

-- 1. Extend gyms table with WhatsApp provider configuration
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS whatsapp_mode TEXT DEFAULT 'cloud_api'
    CHECK (whatsapp_mode IN ('cloud_api', 'local_bridge', 'disabled')),
  ADD COLUMN IF NOT EXISTS bridge_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bridge_token TEXT DEFAULT NULL;

-- 2. Create whatsapp_queue for offline queuing when local bridge is disconnected
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_body TEXT,
  template_name TEXT,
  template_params JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 3. Indexes for rapid worker polling and multi-tenant isolation
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_pending
  ON public.whatsapp_queue (gym_id, status, created_at)
  WHERE status = 'pending';

-- 4. Enable RLS
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_queue_tenant_isolation ON public.whatsapp_queue
  FOR ALL USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );
