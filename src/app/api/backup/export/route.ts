import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(request: Request) {
  try {
    const { user, error: authError } = await getAuthUser(request);
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Resolve gym ID
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', user.id)
      .maybeSingle();

    let gymId = userData?.gym_id;

    if (!gymId) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (ownedGym) gymId = ownedGym.id;
    }

    if (!gymId) {
      // In offline single-gym appliance mode: fallback to only gym
      const { data: allGyms } = await supabaseAdmin.from('gyms').select('id').limit(2);
      if (allGyms && allGyms.length === 1) {
        gymId = allGyms[0].id;
      }
    }

    if (!gymId) {
      return NextResponse.json({ error: 'Gym not found for current session' }, { status: 404 });
    }

    // Export core tables in parallel
    const [
      gymRes,
      branchesRes,
      plansRes,
      membersRes,
      invoicesRes,
      attendanceRes,
      expensesRes,
      leadsRes,
    ] = await Promise.all([
      supabaseAdmin.from('gyms').select('*').eq('id', gymId).single(),
      supabaseAdmin.from('branches').select('*').eq('gym_id', gymId),
      supabaseAdmin.from('plans').select('*').eq('gym_id', gymId),
      supabaseAdmin.from('members').select('*').eq('gym_id', gymId),
      supabaseAdmin.from('invoices').select('*').eq('gym_id', gymId).order('created_at', { ascending: false }).limit(2000),
      supabaseAdmin.from('attendance').select('*').eq('gym_id', gymId).order('date', { ascending: false }).limit(5000),
      supabaseAdmin.from('expenses').select('*').eq('gym_id', gymId).limit(2000),
      supabaseAdmin.from('leads').select('*').eq('gym_id', gymId).limit(2000),
    ]);

    const backupPayload = {
      version: '2.6',
      exportedAt: new Date().toISOString(),
      gymId,
      gym: gymRes.data,
      branches: branchesRes.data || [],
      plans: plansRes.data || [],
      members: membersRes.data || [],
      invoices: invoicesRes.data || [],
      attendance: attendanceRes.data || [],
      expenses: expensesRes.data || [],
      leads: leadsRes.data || [],
      recordCounts: {
        members: (membersRes.data || []).length,
        invoices: (invoicesRes.data || []).length,
        attendance: (attendanceRes.data || []).length,
        plans: (plansRes.data || []).length,
      },
    };

    const fileName = `gymerp-backup-${(gymRes.data?.name || 'gym').replace(/[^a-zA-Z0-9_-]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Backup export failed:', err);
    return NextResponse.json({ error: err.message || 'Backup generation failed' }, { status: 500 });
  }
}
