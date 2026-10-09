import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from('gyms')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Setup status check error:', error);
      return NextResponse.json({ initialized: true, gymCount: 1, error: error.message });
    }

    const gymCount = count || 0;
    return NextResponse.json({
      initialized: gymCount > 0,
      gymCount,
    });
  } catch (err: any) {
    return NextResponse.json({ initialized: true, gymCount: 1, error: err.message });
  }
}
