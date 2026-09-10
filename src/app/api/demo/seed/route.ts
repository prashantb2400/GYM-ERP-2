import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_SEED !== 'true') {
    return NextResponse.json({ success: false, message: 'Demo seeding is disabled' }, { status: 403 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Get gym owner info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('gym_id, role')
      .eq('auth_id', user.id)
      .single();

    if (userError || !userData || !userData.gym_id) {
      return NextResponse.json({ success: false, message: 'Gym not found for user' }, { status: 404 });
    }
    
    if (userData.role !== 'owner') {
      return NextResponse.json({ success: false, message: 'Only owners can seed demo data' }, { status: 403 });
    }

    const gymId = userData.gym_id;

    // Check if already seeded
    const { data: gymData } = await supabase
      .from('gyms')
      .select('settings')
      .eq('id', gymId)
      .single();

    if (gymData?.settings?.demo_seeded) {
      return NextResponse.json({ success: false, message: 'Demo data already seeded' });
    }

    // 1. Update gym with sample details
    await supabase.from('gyms').update({
      gstin: '27AABCU9603R1ZX',
      pan: 'AABCU9603R',
      tagline: 'Stronger Every Day',
      settings: {
        ...(gymData?.settings || {}),
        demo_seeded: true
      }
    }).eq('id', gymId);

    // 2. Create 3 membership plans
    const planTemplates = [
      { name: 'Monthly', duration_days: 30, price: 1000, is_popular: false, features: ['Full gym access', 'Locker', 'WiFi'] },
      { name: 'Quarterly', duration_days: 90, price: 2500, is_popular: true, features: ['Full gym access', 'Locker', 'WiFi', 'Fitness assessment'] },
      { name: 'Annual', duration_days: 365, price: 8000, is_popular: false, features: ['Full gym access', 'Locker', 'WiFi', 'Fitness assessment', 'Personal training (2 sessions)'] },
    ];
    
    const plansToInsert = planTemplates.map((p, i) => ({
      gym_id: gymId,
      ...p,
      display_order: i,
      is_active: true,
      highlights: [],
    }));

    const { data: insertedPlans, error: plansError } = await supabase
      .from('plans')
      .insert(plansToInsert)
      .select();

    if (plansError || !insertedPlans) {
      console.error(plansError);
      return NextResponse.json({ success: false, message: 'Failed to create plans' }, { status: 500 });
    }

    // 3. Create 5 demo members
    const memberTemplates = [
      { name: 'Rahul Sharma', phone: '9876543210', status: 'active', planIdx: 1, daysAgo: 45 },
      { name: 'Priya Singh', phone: '8765432109', status: 'active', planIdx: 0, daysAgo: 10 },
      { name: 'Amit Verma', phone: '7654321098', status: 'active', planIdx: 2, daysAgo: 120 },
      { name: 'Sunita Patel', phone: '6543210987', status: 'expired', planIdx: 0, daysAgo: 45 },
      { name: 'Vikram Joshi', phone: '9123456789', status: 'active', planIdx: 1, daysAgo: 5, totalDue: 500 },
    ];
    
    const memberIds: string[] = [];

    for (let i = 0; i < memberTemplates.length; i++) {
      const template = memberTemplates[i];
      const plan = insertedPlans[template.planIdx];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - template.daysAgo);
      const startStr = startDate.toISOString().split('T')[0];
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration_days);
      const endStr = endDate.toISOString().split('T')[0];

      const memberCode = `MBR000${i + 1}`;
      
      const memberInsert = {
        gym_id: gymId,
        member_code: memberCode,
        name: template.name,
        phone: template.phone,
        status: template.status,
        current_plan_id: plan.id,
        plan_start_date: startStr,
        plan_end_date: endStr,
        admission_date: startStr,
        total_due: template.totalDue || 0,
        total_paid_lifetime: plan.price - (template.totalDue || 0),
        attendance_count: 0,
      };

      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert(memberInsert)
        .select()
        .single();
        
      if (!memberError && member) {
        memberIds.push(member.id);
        
        // Insert invoice
        await supabase.from('invoices').insert({
          gym_id: gymId,
          invoice_number: `INV-2026-000${i + 1}`,
          member_id: member.id,
          member_name: member.name,
          line_items: [{ description: plan.name, qty: 1, rate: plan.price, amount: plan.price }],
          subtotal: plan.price,
          total: plan.price,
          amount_paid: plan.price - (template.totalDue || 0),
          amount_due: template.totalDue || 0,
          status: template.totalDue ? 'partial' : 'paid',
          issued_at: startDate.toISOString(),
          payment_mode: 'upi'
        });
      }
    }

    // 4. Seed attendance for last 7 days
    const attendanceDays = [
      { daysBack: 6, memberIdxs: [0, 1, 2] },      // 3 check-ins
      { daysBack: 5, memberIdxs: [0, 2, 4] },      // 3 check-ins
      { daysBack: 4, memberIdxs: [1, 2] },         // 2 check-ins
      { daysBack: 3, memberIdxs: [0, 1, 2, 4] },   // 4 check-ins
      { daysBack: 2, memberIdxs: [0, 2] },         // 2 check-ins
      { daysBack: 1, memberIdxs: [0, 1, 2, 4] },   // 4 check-ins
      { daysBack: 0, memberIdxs: [0, 1] },         // 2 today
    ];

    const attendanceRecords: any[] = [];
    for (const day of attendanceDays) {
      const date = new Date();
      date.setDate(date.getDate() - day.daysBack);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const mIdx of day.memberIdxs) {
        if (memberIds[mIdx]) {
          const checkInTime = new Date(date);
          checkInTime.setHours(8 + mIdx, 0, 0, 0);
          attendanceRecords.push({
            gym_id: gymId,
            member_id: memberIds[mIdx],
            member_name: memberTemplates[mIdx].name,
            date: dateStr,
            check_in_time: checkInTime.toISOString(),
            method: 'manual'
          });
        }
      }
    }
    
    if (attendanceRecords.length > 0) {
      await supabase.from('attendance').insert(attendanceRecords);
    }
    
    // 5. Update counters
    await supabase.from('counters').update({
      member_count: 5,
      invoice_count: 5,
    }).eq('gym_id', gymId);

    return NextResponse.json({ success: true, message: 'Demo data seeded successfully' });

  } catch (error: any) {
    console.error('Demo seed error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
