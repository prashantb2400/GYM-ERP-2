-- Migration: Create Storage Buckets for member photos and KYC documents
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create 'members' bucket (public, for profile photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('members', 'members', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create 'kyc' bucket (public, for KYC documents)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc', 'kyc', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies — allow authenticated users to upload/read

-- Members bucket: anyone authenticated can upload
DROP POLICY IF EXISTS "members_upload" ON storage.objects;
CREATE POLICY "members_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'members');

-- Members bucket: anyone can view (public bucket)
DROP POLICY IF EXISTS "members_read" ON storage.objects;
CREATE POLICY "members_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'members');

-- Members bucket: authenticated users can update their uploads
DROP POLICY IF EXISTS "members_update" ON storage.objects;
CREATE POLICY "members_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'members');

-- KYC bucket: authenticated users can upload
DROP POLICY IF EXISTS "kyc_upload" ON storage.objects;
CREATE POLICY "kyc_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc');

-- KYC bucket: authenticated users can read
DROP POLICY IF EXISTS "kyc_read" ON storage.objects;
CREATE POLICY "kyc_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kyc');

-- KYC bucket: authenticated users can update
DROP POLICY IF EXISTS "kyc_update" ON storage.objects;
CREATE POLICY "kyc_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc');
