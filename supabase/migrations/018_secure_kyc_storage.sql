-- =========================================================================
-- GymERP Migration 018: Harden KYC Storage & Enforce Private Access
-- =========================================================================

-- 1. Ensure KYC storage buckets are strictly private
UPDATE storage.buckets SET public = false WHERE id IN ('kyc', 'kyc-documents');

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Drop insecure public/global read policies
DROP POLICY IF EXISTS "kyc_read" ON storage.objects;
DROP POLICY IF EXISTS "kyc_upload" ON storage.objects;
DROP POLICY IF EXISTS "kyc_update" ON storage.objects;

-- 3. Staff & Owners can only read KYC documents belonging to their gym folder (<gym_id>/...)
CREATE POLICY "kyc_staff_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id IN ('kyc', 'kyc-documents')
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
      )
      OR
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      )
    )
  );

-- 4. Authorized staff can upload to their gym folder
CREATE POLICY "kyc_staff_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('kyc', 'kyc-documents')
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT gym_id FROM public.users WHERE auth_id = auth.uid()
      )
      OR
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      )
    )
  );
