-- =========================================================================
-- GymERP Migration 012: Fingerprint Biometrics Schema & Roster Indexes
-- =========================================================================

-- 1. Add fingerprint columns to public.members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS fingerprint_template JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fingerprint_finger VARCHAR(30) DEFAULT 'right_thumb',
  ADD COLUMN IF NOT EXISTS fingerprint_quality INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fingerprint_enrolled_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Ensure biometric_enrolled is boolean with default false
ALTER TABLE public.members
  ALTER COLUMN biometric_enrolled SET DEFAULT FALSE;

-- 3. Composite index for fast 1:N kiosk fingerprint roster queries
CREATE INDEX IF NOT EXISTS idx_members_fingerprint_roster
  ON public.members (gym_id, branch_id, status)
  WHERE biometric_enrolled = TRUE OR fingerprint_template IS NOT NULL;

-- 4. Verify attendance method check constraint includes 'fingerprint'
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_method_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_method_check
  CHECK (method IN ('manual', 'face_recognition', 'fingerprint', 'qr_scan'));
