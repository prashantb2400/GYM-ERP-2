-- Migration 010: QR Code and Biometric Face Attendance Support
-- Run this in your Supabase Dashboard → SQL Editor

-- 1. Ensure qr_token column on public.members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid();

-- 2. Backfill any NULL qr_tokens for existing members
UPDATE public.members 
SET qr_token = gen_random_uuid() 
WHERE qr_token IS NULL;

-- 3. Ensure unique index on qr_token
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_qr_token ON public.members(qr_token);

-- 4. Ensure face_descriptor and consent_given_at columns on public.members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- 5. Ensure check_out_time on public.attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

-- 6. Update attendance method check constraint to support all check-in methods
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_method_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_method_check
  CHECK (method IN ('manual', 'face_recognition', 'fingerprint', 'qr_scan'));

-- 7. Performance index for face kiosk roster fetching
CREATE INDEX IF NOT EXISTS idx_members_face_roster 
  ON public.members(gym_id, status, face_enrolled) 
  WHERE face_enrolled = true;
