import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status_filter') || '';
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from('platform_invoices')
      .select(`
        *,
        gyms (id, name),
        platform_plans (id, name)
      `, { count: 'exact' });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo);
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

export async function POST(request: Request) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const body = await request.json();
    const { gym_id, plan_id, amount, tax_amount, total_amount, notes } = body;

    // Generate invoice number PLAT-YYYY-NNNN
    const year = new Date().getFullYear();
    
    // Get count for the year to generate NNNN
    const { count, error: countError } = await supabaseAdmin
      .from('platform_invoices')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01T00:00:00Z`);
      
    if (countError) throw countError;
    
    const nextNum = (count || 0) + 1;
    const invoice_number = `PLAT-${year}-${nextNum.toString().padStart(4, '0')}`;

    const { data, error } = await supabaseAdmin
      .from('platform_invoices')
      .insert({
        gym_id,
        plan_id,
        amount,
        tax_amount,
        total_amount,
        notes,
        invoice_number,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
