import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { confirmation } = await request.json();
  if (confirmation !== 'DELETE MY GYM') {
    return NextResponse.json({ error: 'Invalid confirmation text' }, { status: 400 });
  }

  // Get gym owned by this user
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('gym_id, role')
    .eq('auth_id', user.id)
    .single();

  if (!userData?.gym_id || userData.role !== 'owner') {
    return NextResponse.json({ error: 'Not a gym owner' }, { status: 403 });
  }

  const gymId = userData.gym_id;

  try {
    // Cascade delete in order (due to FK constraints)
    // Most will cascade automatically via ON DELETE CASCADE in migrations
    // but we explicitly delete PII data first
    
    // 1. Delete attendance records
    await supabaseAdmin.from('attendance').delete().eq('gym_id', gymId);
    
    // 2. Delete WhatsApp logs
    await supabaseAdmin.from('whatsapp_logs').delete().eq('gym_id', gymId);
    
    // 3. Delete invoices
    await supabaseAdmin.from('invoices').delete().eq('gym_id', gymId);
    
    // 4. Delete members
    await supabaseAdmin.from('members').delete().eq('gym_id', gymId);
    
    // 5. H-11 FIX: 'staff' table does not exist — staff are in public.users (role=trainer/receptionist)
    // They will be removed by step 6 (delete users associated with this gym)
    
    // 6. Delete users associated with this gym (includes trainers, receptionists, owner)
    await supabaseAdmin.from('users').delete().eq('gym_id', gymId);
    
    // 7. Delete the gym itself (cascades remaining tables)
    await supabaseAdmin.from('gyms').delete().eq('id', gymId);
    
    // 8. Delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Your account and all associated data has been permanently deleted.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Deletion failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
