-- =========================================================================
-- GymERP Migration 017: CCTV Camera Management & Entrance Vigilance Events
-- =========================================================================

-- 1. CCTV Cameras Configuration Table
CREATE TABLE IF NOT EXISTS public.cctv_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rtsp_url TEXT NOT NULL,
  location TEXT DEFAULT 'Main Entrance',
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  fps NUMERIC(4,1) DEFAULT 0.0,
  last_ping_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{"motion_threshold": 0.5, "face_detection": true, "record_attendance": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Vigilance & Security Events Table
CREATE TABLE IF NOT EXISTS public.vigilance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  camera_id UUID REFERENCES public.cctv_cameras(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('unknown_visitor', 'expired_member', 'due_defaulter', 'auto_attendance')),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  member_name TEXT,
  confidence NUMERIC(4,3),
  snapshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'acknowledged', 'lead_created', 'dismissed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Update attendance method check constraint to include 'cctv'
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_method_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_method_check
  CHECK (method IN ('manual', 'face_recognition', 'fingerprint', 'qr_scan', 'cctv'));

-- 4. Indexes for fast performance
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_gym ON public.cctv_cameras(gym_id);
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_branch ON public.cctv_cameras(branch_id);
CREATE INDEX IF NOT EXISTS idx_cctv_cameras_status ON public.cctv_cameras(status);

CREATE INDEX IF NOT EXISTS idx_vigilance_events_gym ON public.vigilance_events(gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vigilance_events_type ON public.vigilance_events(gym_id, event_type);
CREATE INDEX IF NOT EXISTS idx_vigilance_events_status ON public.vigilance_events(gym_id, status);

-- 5. Row-Level Security (RLS)
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vigilance_events ENABLE ROW LEVEL SECURITY;

-- CCTV Cameras Select: Gym Users & Owners
DROP POLICY IF EXISTS cctv_cameras_select ON public.cctv_cameras;
CREATE POLICY cctv_cameras_select ON public.cctv_cameras
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- CCTV Cameras Manage: Owners & Authorized Staff
DROP POLICY IF EXISTS cctv_cameras_manage ON public.cctv_cameras;
CREATE POLICY cctv_cameras_manage ON public.cctv_cameras
  FOR ALL USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Vigilance Events Select: Gym Users & Owners
DROP POLICY IF EXISTS vigilance_events_select ON public.vigilance_events;
CREATE POLICY vigilance_events_select ON public.vigilance_events
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );

-- Vigilance Events Manage: Gym Users & Owners
DROP POLICY IF EXISTS vigilance_events_manage ON public.vigilance_events;
CREATE POLICY vigilance_events_manage ON public.vigilance_events
  FOR ALL USING (
    gym_id IN (
      SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
    )
    OR
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
    )
  );
