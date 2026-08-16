import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { id } = await params;
    
    // Get the gym owner
    const { data: gym, error } = await supabaseAdmin
      .from('gyms')
      .select('owner_id, name')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!gym) return NextResponse.json({ error: 'Gym not found' }, { status: 404 });

    // Since actual impersonation requires creating an auth session for another user
    // which involves custom tokens or returning raw session info (often complex with Supabase),
    // we return the details for the frontend to handle or notify it's restricted by current auth setup
    
    // Returning this data for the frontend to potentially use a custom impersonation mechanism
    return NextResponse.json({ 
      success: true, 
      impersonation_data: {
        gym_id: id,
        user_id: gym.owner_id,
        gym_name: gym.name,
        message: 'Impersonation requires frontend token generation support'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
