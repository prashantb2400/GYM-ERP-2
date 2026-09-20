-- =========================================================================
-- GymERP Migration 016: Kiosk Device Pairings & Zero-Password Terminal Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.kiosk_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL DEFAULT 'Reception Tablet Kiosk',
  device_token TEXT NOT NULL UNIQUE,
  pairing_code VARCHAR(10) UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  pairing_expires_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{"voice_enabled": true, "language": "en-IN", "print_mode": "thermal"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast device token and pairing code lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_gym_id ON public.kiosk_devices(gym_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_device_token ON public.kiosk_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_pairing_code ON public.kiosk_devices(pairing_code);
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_status ON public.kiosk_devices(status);

-- Enable RLS
ALTER TABLE public.kiosk_devices ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Staff and Owners of this gym
DROP POLICY IF EXISTS kiosk_devices_select ON public.kiosk_devices;
CREATE POLICY kiosk_devices_select ON public.kiosk_devices
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- 2. INSERT/UPDATE/DELETE Policy: Gym Owners only
DROP POLICY IF EXISTS kiosk_devices_manage ON public.kiosk_devices;
CREATE POLICY kiosk_devices_manage ON public.kiosk_devices
  FOR ALL USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );
