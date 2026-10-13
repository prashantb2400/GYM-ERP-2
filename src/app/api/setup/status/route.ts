import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkAndAutoSeedDemoGym, isAutoSeedEnabled } from '@/lib/server/auto-seed';

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

    // Cold-boot auto-seed: If no gyms exist and AUTO_SEED_DEMO_GYM is active, auto-provision
    if (gymCount === 0 && isAutoSeedEnabled()) {
      const seedResult = await checkAndAutoSeedDemoGym();
      if (seedResult.seeded) {
        return NextResponse.json({
          initialized: true,
          autoSeeded: true,
          gymCount: 1,
          gymId: seedResult.gymId,
          branchId: seedResult.branchId,
          kioskToken: seedResult.kioskToken,
          message: 'GymERP automatically initialized with demo appliances and workout splits',
        });
      }
    }

    return NextResponse.json({
      initialized: gymCount > 0,
      gymCount,
    });
  } catch (err: any) {
    return NextResponse.json({ initialized: true, gymCount: 1, error: err.message });
  }
}
