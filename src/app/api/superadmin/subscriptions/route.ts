import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status_filter') || '';
    const planFilter = searchParams.get('plan_filter') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from('platform_subscriptions')
      .select(`
        *,
        gyms (id, name),
        platform_plans (id, name)
      `, { count: 'exact' });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    if (planFilter) {
      query = query.eq('plan_id', planFilter);
    }

    const { data, count, error } = await query
      .range(offset, offset + perPage - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data,
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
