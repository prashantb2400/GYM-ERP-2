import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateTextPdf } from '@/lib/pdf/generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // M-20 FIX: Fetch real exercise chart record and corresponding gym by ID
    const { data: chart, error: chartError } = await supabaseAdmin
      .from('exercise_charts')
      .select('*, gyms(*), members(*)')
      .eq('id', id)
      .maybeSingle();

    let gymName = 'GymERP';
    let memberName = 'Member';
    let routineName = 'Workout Schedule';
    let days: Array<{ day: string; exercises?: any[] }> = [];

    if (chart) {
      gymName = chart.gyms?.name || gymName;
      memberName = chart.members?.name || memberName;
      routineName = chart.name || routineName;
      days = Array.isArray(chart.days) ? chart.days : [];
    } else {
      // Check if id is a member_id with assigned exercise chart
      const { data: memberData } = await supabaseAdmin
        .from('members')
        .select('*, gyms(*), exercise_charts(*)')
        .eq('id', id)
        .maybeSingle();

      if (memberData) {
        gymName = memberData.gyms?.name || gymName;
        memberName = memberData.name;
        routineName = memberData.exercise_charts?.name || routineName;
        days = Array.isArray(memberData.exercise_charts?.days) ? memberData.exercise_charts.days : [];
      }
    }

    const lines = [
      `${gymName} — ${routineName}`,
      `Member: ${memberName}`,
      `Generated: ${new Date().toLocaleDateString('en-IN')}`,
      '----------------------------------------',
      ...days.flatMap((d) => [
        `\n[${d.day}]`,
        ...(Array.isArray(d.exercises)
          ? d.exercises.map((ex: any) => `  - ${ex.name}: ${ex.sets} sets x ${ex.reps} reps (Rest: ${ex.rest_seconds || 60}s)`)
          : []),
      ]),
    ];

    const pdf = generateTextPdf(lines);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="exercise-plan-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate exercise plan PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
