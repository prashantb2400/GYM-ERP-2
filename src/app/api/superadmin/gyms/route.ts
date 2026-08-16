import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const planFilter = searchParams.get('plan_filter') || '';
    const statusFilter = searchParams.get('status_filter') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    
    const offset = (page - 1) * perPage;

    // Building the query to fetch gyms with their subscriptions and owner
    let query = supabaseAdmin
      .from('gyms')
      .select(`
        *,
        platform_subscriptions (
          *,
          platform_plans (*)
        ),
        users!gyms_owner_id_fkey (*)
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    if (planFilter) {
      query = query.eq('platform_plan_id', planFilter);
    }

    if (statusFilter === 'active') {
      query = query.eq('is_suspended', false);
    } else if (statusFilter === 'suspended') {
      query = query.eq('is_suspended', true);
    }

    // Execute paginated query
    const { data: gyms, count, error } = await query
      .range(offset, offset + perPage - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get member counts for these gyms
    const gymIds = gyms.map(g => g.id);
    let memberCounts: Record<string, number> = {};
    
    if (gymIds.length > 0) {
      const { data: memberData, error: memberError } = await supabaseAdmin
        .from('gym_members')
        .select('gym_id')
        .in('gym_id', gymIds);
        
      if (!memberError && memberData) {
        memberData.forEach(m => {
          memberCounts[m.gym_id] = (memberCounts[m.gym_id] || 0) + 1;
        });
      }
    }

    // Format response
    const formattedGyms = gyms.map(gym => ({
      ...gym,
      member_count: memberCounts[gym.id] || 0
    }));

    return NextResponse.json({
      data: formattedGyms,
      meta: {
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
