import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/server/auth-helper';
import { getBranchScope, isBranchScopeError } from '@/lib/server/branch-scope';

export const STANDARD_GYM_PLANS = [
  {
    name: '1 Month General Fitness',
    duration_days: 30,
    price: 1500,
    features: ['Full Gym Access', 'General Trainer Guidance', 'Locker & Shower Facility'],
    highlights: ['Month-to-Month Flexibility'],
    is_popular: false,
    display_order: 1,
  },
  {
    name: '3 Months Transformation',
    duration_days: 90,
    price: 4000,
    features: ['Full Gym Access', 'Custom Workout Routine', 'Diet & Nutrition Guidance', 'Locker & Shower'],
    highlights: ['Best for Consistent Progress', 'Save ₹500 vs Monthly'],
    is_popular: true,
    display_order: 2,
  },
  {
    name: '6 Months Power Fitness',
    duration_days: 180,
    price: 7500,
    features: ['Full Gym Access', 'Personalized Diet Chart', 'Monthly Body Composition Analysis', 'Locker & Shower'],
    highlights: ['Half-Year Commitment', 'Save ₹1,500'],
    is_popular: false,
    display_order: 3,
  },
  {
    name: '1 Year Platinum VIP',
    duration_days: 365,
    price: 13000,
    features: ['Full Gym Access (All Hours)', 'Comprehensive Workout & Diet Programs', 'Quarterly PT Sessions', 'Guest Passes (2/yr)', 'Dedicated Locker'],
    highlights: ['Maximum Value', 'Save ₹5,000'],
    is_popular: false,
    display_order: 4,
  },
  {
    name: 'Personal Training (1 Month Add-on)',
    duration_days: 30,
    price: 5000,
    features: ['12 One-on-One Training Sessions', 'Form & Technique Correction', 'Tailored Hypertrophy/Fat Loss Plan', 'Weekly Body Stat Tracking'],
    highlights: ['Accelerated Goal Achievement'],
    is_popular: false,
    display_order: 5,
  },
];

export async function POST(request: Request) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return NextResponse.json({ error: authErr || 'Unauthorized' }, { status: 401 });
    }

    const scope = await getBranchScope(user.id);
    if (isBranchScopeError(scope)) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    if (!scope.isOwner && scope.role !== 'receptionist') {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to seed plans' }, { status: 403 });
    }

    // Check if plans already exist
    const { data: existingPlans, error: checkError } = await supabaseAdmin
      .from('plans')
      .select('id, name')
      .eq('gym_id', scope.gymId);

    if (checkError) {
      throw checkError;
    }

    if (existingPlans && existingPlans.length > 0) {
      return NextResponse.json({
        success: true,
        alreadySeeded: true,
        message: 'Membership plans already configured for this gym',
        plans: existingPlans,
      });
    }

    // Insert starter plans
    const toInsert = STANDARD_GYM_PLANS.map(p => ({
      gym_id: scope.gymId,
      name: p.name,
      duration_days: p.duration_days,
      price: p.price,
      features: p.features,
      highlights: p.highlights,
      is_popular: p.is_popular,
      is_active: true,
      display_order: p.display_order,
    }));

    const { data: createdPlans, error: insertError } = await supabaseAdmin
      .from('plans')
      .insert(toInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      alreadySeeded: false,
      message: 'Successfully initialized 5 standard gym membership plans',
      plans: createdPlans || [],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to seed membership plans';
    console.error('Plan seeding error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
