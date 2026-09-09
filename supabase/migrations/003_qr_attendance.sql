-- Migration: Add QR code attendance support
-- Adds qr_token to members table and 'qr_scan' to attendance method constraint

-- 1. Add qr_token column to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS qr_token UUID DEFAULT gen_random_uuid();

-- 2. Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_qr_token ON public.members(qr_token);

-- 3. Backfill any NULL qr_tokens (for existing members)
UPDATE public.members SET qr_token = gen_random_uuid() WHERE qr_token IS NULL;

-- 4. Make qr_token NOT NULL after backfill
ALTER TABLE public.members ALTER COLUMN qr_token SET NOT NULL;

-- 5. Update attendance method CHECK constraint to include 'qr_scan'
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_method_check;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_method_check
  CHECK (method IN ('manual', 'face_recognition', 'fingerprint', 'qr_scan'));
