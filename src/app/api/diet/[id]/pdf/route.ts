import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateDietChartHTML } from '@/lib/pdf/diet-template';
import { DietChartData, DietFoodItem, Meal } from '@/lib/pdf/types';

import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return new NextResponse('Unauthorized: Valid session required to view diet chart', { status: 401 });
    }

    const { id } = await params;
    const dietId = id;

    // 1. Fetch diet chart by ID or check if ID belongs to a member (using admin client to bypass RLS for print)
    let { data: chart } = await supabaseAdmin
      .from('diet_charts')
      .select('*, gyms(*)')
      .eq('id', dietId)
      .single();

    let memberData: any = null;
    let gymRecord = chart?.gyms as any;

    if (!chart) {
      const { data: member } = await supabaseAdmin
        .from('members')
        .select('*, diet_charts(*), gyms(*)')
        .eq('id', dietId)
        .single();
      if (member) {
        memberData = member;
        chart = member.diet_charts as any;
        gymRecord = member.gyms as any;
      }
    }

    const gymId = chart?.gym_id || memberData?.gym_id;

    if (!chart && !memberData) {
      return new NextResponse('Diet chart not found', { status: 404 });
    }

    // Verify caller belongs to this gym or is the member themselves
    const { data: callerUser } = await supabaseAdmin
      .from('users')
      .select('gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    const { data: callerMember } = await supabaseAdmin
      .from('members')
      .select('id, gym_id')
      .eq('auth_id', user.id)
      .maybeSingle();

    const isOwnerOrStaff = callerUser && callerUser.gym_id === gymId;
    const isSelf = callerMember && (callerMember.id === memberData?.id || callerMember.gym_id === gymId);

    if (!isOwnerOrStaff && !isSelf) {
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('id', gymId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!ownedGym) {
        return new NextResponse('Forbidden: You do not have access to this nutrition plan', { status: 403 });
      }
    }

    // 2. Resolve Gym Profile
    let gymProfile = gymRecord;
    if (!gymProfile && gymId) {
      const { data: g } = await supabaseAdmin.from('gyms').select('*').eq('id', gymId).single();
      gymProfile = g;
    }

    // 3. Resolve Branch Profile (if assigned to branch)
    let branchData: any = null;
    const branchId = memberData?.branch_id || chart?.branch_id;
    if (branchId) {
      const { data: branch } = await supabaseAdmin.from('branches').select('*').eq('id', branchId).maybeSingle();
      branchData = branch;
    }

    const rawGymName = gymProfile?.name?.trim() || gymProfile?.business_name?.trim() || '';
    const resolvedGymName = (rawGymName && rawGymName !== 'Gym Center' && rawGymName !== 'Fitness & Health Club')
      ? rawGymName
      : 'Fitness Club';

    const gymData = {
      name: resolvedGymName,
      tagline: gymProfile?.tagline || '',
      address: gymProfile?.address || {},
      phone: gymProfile?.phone || '',
      email: gymProfile?.email || '',
    };

    // Format branch/gym address
    const activeAddress = branchData?.address && Object.keys(branchData.address).length > 0
      ? branchData.address
      : gymData.address;

    let addressStr = '';
    if (typeof activeAddress === 'string') {
      addressStr = activeAddress;
    } else if (typeof activeAddress === 'object' && activeAddress !== null) {
      const { street, city, state, pin, postal_code } = activeAddress;
      addressStr = [street, city, state, pin || postal_code].filter(Boolean).join(', ');
    }
    if (!addressStr) addressStr = 'Official Gym Address';

    // 4. Transform Meals preserving rich structured food items
    const rawMeals: any[] = Array.isArray(chart?.meals) && chart.meals.length > 0 ? chart.meals : [];

    const meals: Meal[] = rawMeals.map((m: any) => {
      const items: DietFoodItem[] = Array.isArray(m.items)
        ? m.items.map((it: any) => {
            if (typeof it === 'string') {
              return { name: it, qty: '1 serving', calories: 0, protein: 0 };
            }
            return {
              name: it.name || 'Food Item',
              qty: it.qty || '1 serving',
              calories: Number(it.calories) || 0,
              protein: Number(it.protein) || 0,
            };
          })
        : [];

      const mealCals = Number(m.calories) || items.reduce((s, it) => s + (it.calories || 0), 0);
      const mealPro = Number(m.protein) || items.reduce((s, it) => s + (it.protein || 0), 0);

      return {
        name: m.meal_name || m.name || 'Meal',
        time: m.time || '12:00 PM',
        items,
        calories: mealCals,
        protein: mealPro,
      };
    });

    const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = meals.reduce((sum, m) => sum + (m.protein || 0), 0);

    const isTemplate = !memberData;
    const planTitle = chart?.name || (isTemplate ? 'Standard Gym Diet Plan' : 'Personalized Member Nutrition Chart');

    const templateData: DietChartData = {
      gym: {
        name: gymData.name,
        tagline: gymData.tagline,
        branchName: branchData?.name,
        address: addressStr,
        phone: branchData?.phone || gymData.phone || 'N/A',
        email: branchData?.email || gymData.email || 'N/A',
      },
      planTitle,
      isTemplate,
      member: {
        id: memberData?.id || chart?.id || dietId,
        name: memberData?.name || 'Trainee / Gym Member',
        memberCode: memberData?.member_code,
        phone: memberData?.phone,
        weight: memberData?.weight_kg || undefined,
        height: memberData?.height_cm ? `${memberData.height_cm} cm` : undefined,
        goal: memberData?.health_goals?.[0] || chart?.name || 'Hypertrophy & Fat Loss',
      },
      dateIssued: new Date().toISOString(),
      targetCalories: chart?.target_calories ? Number(chart.target_calories) : (totalCalories || 2000),
      trainerName: chart?.created_by_name || 'Certified Nutritionist',
      trainerNotes: chart?.description || 'Maintain strict hydration (3.5L+ water daily). Avoid refined sugars and processed oils.',
      waterIntakeLiters: 3.5,
      meals,
      totalCalories,
      totalProtein,
    };

    const html = generateDietChartHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="diet-chart-${dietId}.html"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate diet chart PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
