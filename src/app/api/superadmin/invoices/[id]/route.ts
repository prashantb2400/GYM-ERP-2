import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/platform/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await requireSuperAdmin(request);
  if (authCheck instanceof Response) return authCheck;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, razorpay_payment_id } = body;

    const updates: any = {};
    if (status) updates.status = status;
    
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
      if (razorpay_payment_id) updates.razorpay_payment_id = razorpay_payment_id;
    }

    const { data, error } = await supabaseAdmin
      .from('platform_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
