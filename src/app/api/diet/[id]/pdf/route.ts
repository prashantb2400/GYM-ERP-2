import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDietChartHTML } from '@/lib/pdf/diet-template';
import { DietChartData } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const dietId = id;

    // Fetch diet chart or check if dietId belongs to a member
    let { data: chart } = await supabase
      .from('diet_charts')
      .select('*, gyms(*)')
      .eq('id', dietId)
      .single();

    let memberData: any = null;
    let gymRecord = chart?.gyms as any;

    if (!chart) {
      const { data: member } = await supabase
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

    const gymData = gymRecord || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com'
    };

    const defaultMeals = [
      {
        name: 'Breakfast',
        time: '08:00 AM',
        items: ['4 Egg Whites', '1 Whole Egg', '2 Slices Whole Wheat Bread', '1 Apple'],
        calories: 350,
        protein: 25,
        carbs: 40,
        fats: 10,
      },
      {
        name: 'Lunch',
        time: '01:30 PM',
        items: ['150g Chicken Breast', '1 Cup Brown Rice', 'Mixed Green Salad'],
        calories: 450,
        protein: 45,
        carbs: 45,
        fats: 8,
      },
      {
        name: 'Dinner',
        time: '08:00 PM',
        items: ['150g Grilled Fish', 'Steamed Broccoli', 'Half Sweet Potato'],
        calories: 300,
        protein: 35,
        carbs: 25,
        fats: 6,
      }
    ];

    const meals = Array.isArray(chart?.meals) && chart.meals.length > 0
      ? chart.meals.map((m: any) => ({
          name: m.meal_name || m.name || 'Meal',
          time: m.time || '12:00 PM',
          items: Array.isArray(m.items) ? m.items.map((it: any) => typeof it === 'string' ? it : `${it.name} - ${it.qty || ''}`) : [],
          calories: Number(m.calories) || (Array.isArray(m.items) ? m.items.reduce((s: number, it: any) => s + (Number(it.calories) || 0), 0) : 0),
          protein: Number(m.protein) || (Array.isArray(m.items) ? m.items.reduce((s: number, it: any) => s + (Number(it.protein) || 0), 0) : 0),
          carbs: Number(m.carbs) || 0,
          fats: Number(m.fats) || 0,
        }))
      : defaultMeals;

    const totalCalories = meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
    const totalProtein = meals.reduce((sum: number, m: any) => sum + (m.protein || 0), 0);
    const totalCarbs = meals.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0);
    const totalFats = meals.reduce((sum: number, m: any) => sum + (m.fats || 0), 0);

    const templateData: DietChartData = {
      gym: {
        name: gymData.business_name || gymData.name,
        address: typeof gymData.address === 'object' && gymData.address !== null
          ? `${gymData.address.street || ''} ${gymData.address.city || ''} ${gymData.address.state || ''} ${gymData.address.pin || ''}`.trim() || 'Address not provided'
          : (gymData.address || 'Address not provided'),
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
      },
      member: {
        id: memberData?.id || dietId,
        name: memberData?.name || chart?.name || 'Member',
        weight: memberData?.weight_kg || 70,
        goal: memberData?.health_goals?.[0] || 'Fitness',
      },
      dateIssued: new Date().toISOString(),
      trainerName: 'Master Trainer',
      trainerNotes: chart?.description || 'Drink at least 3-4 liters of water daily. Avoid sugar and processed foods.',
      meals,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFats,
    };

    const html = generateDietChartHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="diet-chart-${dietId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate diet chart PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
