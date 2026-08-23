import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateTextPdf } from '@/lib/pdf/generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // M-20 FIX: Fetch real diet chart record and corresponding gym by ID
    const { data: chart, error: chartError } = await supabaseAdmin
      .from('diet_charts')
      .select('*, gyms(*), members(*)')
      .eq('id', id)
      .maybeSingle();

    let gymName = 'GymERP';
    let memberName = 'Member';
    let chartName = 'Nutrition Diet Plan';
    let meals: Array<{ meal_name: string; time?: string; items?: any[] }> = [];

    if (chart) {
      gymName = chart.gyms?.name || gymName;
      memberName = chart.members?.name || memberName;
      chartName = chart.name || chartName;
      meals = Array.isArray(chart.meals) ? chart.meals : [];
    } else {
      // Check if id is a member_id with assigned diet chart
      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('*, gyms(*), diet_charts(*)')
        .eq('id', id)
        .maybeSingle();

      if (memberData) {
        gymName = memberData.gyms?.name || gymName;
        memberName = memberData.name;
        chartName = memberData.diet_charts?.name || chartName;
        meals = Array.isArray(memberData.diet_charts?.meals) ? memberData.diet_charts.meals : [];
      }
    }

    const lines = [
      `${gymName} — ${chartName}`,
      `Member: ${memberName}`,
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      '----------------------------------------',
      ...meals.map((m) => {
        const itemStr = Array.isArray(m.items)
          ? m.items.map((it: any) => `${it.name || it} (${it.qty || ''})`).join(', ')
          : '';
        return `${m.time || ''} [${m.meal_name}]: ${itemStr}`;
      }),
    ];

    const pdf = generateTextPdf(lines);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="diet-chart-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate diet chart PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
