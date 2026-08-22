import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type GymStaff = {
  userId: string;
  gymId: string;
  role: 'owner' | 'receptionist' | 'trainer';
};

export async function requireGymStaff(
  allowedRoles: GymStaff['role'][] = ['owner', 'receptionist']
): Promise<GymStaff | Response> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: staff, error: staffError } = await supabase
    .from('users')
    .select('gym_id, role, is_active')
    .eq('auth_id', user.id)
    .single();

  if (staffError || !staff?.gym_id || !staff.is_active) {
    return NextResponse.json({ error: 'Gym staff account not found' }, { status: 403 });
  }

  if (!allowedRoles.includes(staff.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { userId: user.id, gymId: staff.gym_id, role: staff.role };
}
