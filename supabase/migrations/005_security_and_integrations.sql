-- Security and integration contract fixes.

-- Restrict member writes to the owner's gym or the staff member's branch.
DROP POLICY IF EXISTS "Staff can manage members" ON public.members;

CREATE POLICY "Owners can manage members in their gym" ON public.members
  FOR ALL USING (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  ) WITH CHECK (
    gym_id = get_user_gym_id() AND get_user_role() = 'owner'
  );

CREATE POLICY "Branch staff can manage branch members" ON public.members
  FOR ALL USING (
    gym_id = get_user_gym_id()
    AND get_user_role() = 'receptionist'
    AND branch_id = (SELECT branch_id FROM public.users WHERE auth_id = auth.uid())
  ) WITH CHECK (
    gym_id = get_user_gym_id()
    AND get_user_role() = 'receptionist'
    AND branch_id = (SELECT branch_id FROM public.users WHERE auth_id = auth.uid())
  );

-- Replace SECURITY DEFINER helpers with fixed search paths and caller checks.
CREATE OR REPLACE FUNCTION public.increment_counter(p_gym_id UUID, p_field TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_val INTEGER;
BEGIN
  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND gym_id = p_gym_id AND role IN ('owner', 'receptionist') AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.counters (gym_id, member_count, invoice_count)
  VALUES (p_gym_id, 0, 0)
  ON CONFLICT (gym_id) DO NOTHING;

  IF p_field = 'member_count' THEN
    UPDATE public.counters SET member_count = member_count + 1
    WHERE gym_id = p_gym_id RETURNING member_count INTO new_val;
  ELSIF p_field = 'invoice_count' THEN
    UPDATE public.counters SET invoice_count = invoice_count + 1
    WHERE gym_id = p_gym_id RETURNING invoice_count INTO new_val;
  ELSE
    RAISE EXCEPTION 'Invalid counter field';
  END IF;

  RETURN new_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_member_code(p_gym_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'GYM' || LPAD(public.increment_counter(p_gym_id, 'member_count')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_gym_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(public.increment_counter(p_gym_id, 'invoice_count')::TEXT, 4, '0');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_counter(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_member_code(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_counter(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_member_code(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(UUID) TO authenticated, service_role;

-- Tables used by the hardware bridge and CCTV service.
CREATE TABLE IF NOT EXISTS public.hardware_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  biometric_user_id INTEGER NOT NULL,
  UNIQUE(gym_id, biometric_user_id),
  UNIQUE(gym_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.cctv_cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hardware_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view hardware users" ON public.hardware_users
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Owners can manage hardware users" ON public.hardware_users
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner')
  WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'owner');
CREATE POLICY "Staff can view cameras" ON public.cctv_cameras
  FOR SELECT USING (gym_id = get_user_gym_id());
CREATE POLICY "Owners can manage cameras" ON public.cctv_cameras
  FOR ALL USING (gym_id = get_user_gym_id() AND get_user_role() = 'owner')
  WITH CHECK (gym_id = get_user_gym_id() AND get_user_role() = 'owner');
