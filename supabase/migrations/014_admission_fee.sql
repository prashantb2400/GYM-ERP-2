-- Migration 014: Add admission_fee column to members table
-- Supports one-time registration/admission fees charged during member onboarding

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS admission_fee DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.members.admission_fee IS 'One-time admission/registration fee charged during onboarding';
