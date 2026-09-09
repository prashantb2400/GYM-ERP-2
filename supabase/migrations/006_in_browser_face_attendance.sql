-- Migration 004: In-Browser Face Recognition Attendance
-- Adds 128-d face descriptor vector and DPDP consent tracking to members
-- Adds check_out_time to attendance for automatic In/Out tracking

-- 1. Add face_descriptor and consent_given_at columns to members
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS face_descriptor JSONB,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ;

-- 2. Add check_out_time to attendance table
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

-- 3. Create index for fast roster fetching of face-enrolled active members
CREATE INDEX IF NOT EXISTS idx_members_face_enrolled 
  ON public.members(gym_id, face_enrolled, status) 
  WHERE face_enrolled = true;
