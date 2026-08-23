import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;

    // 1. Fetch member details
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('members')
      .select('*, plans(*), diet_charts(*), exercise_charts(*)')
      .eq('id', memberId)
      .single();

    if (memberErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // 2. Fetch latest paid invoice for the plan renewal
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('member_id', memberId)
      .order('issued_at', { ascending: false })
      .limit(1);

    const invoice = invoices?.[0] || null;

    // 3. Construct a beautiful unified HTML template for A4 download/print consolidation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Renewal Pack - ${member.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1c1917; line-height: 1.5; margin: 0; padding: 40px; background-color: #ffffff; }
          .page-break { page-break-after: always; }
          h1, h2, h3 { color: #6b21a8; margin-top: 0; }
          .header { border-bottom: 2px solid #e9d5ff; padding-bottom: 20px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
          .section { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f3e8ff; color: #581c87; font-weight: bold; text-align: left; padding: 10px; font-size: 12px; }
          td { border-bottom: 1px solid #f3f4f6; padding: 10px; font-size: 12px; }
          .bmi-badge { background-color: #faf5ff; border: 1px solid #e9d5ff; padding: 15px; border-radius: 8px; margin-top: 10px; }
          .item-list { margin: 5px 0 0 15px; padding: 0; font-size: 11px; color: #4b5563; }
        </style>
      </head>
      <body>
        <!-- Page 1: Plan Invoice & BMI Status -->
        <div class="page-break">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">GymERP Member Renewal Pack</h1>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">Unified Invoice, Diet & Routine Document</p>
          </div>

          <div class="section">
            <h2>1. Renewed Invoice Receipt</h2>
            ${invoice ? `
              <div class="grid">
                <div>
                  <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                  <p><strong>Issue Date:</strong> ${new Date(invoice.issued_at).toLocaleDateString('en-IN')}</p>
                  <p><strong>Payment Mode:</strong> <span style="text-transform: capitalize;">${invoice.payment_mode || 'Cash'}</span></p>
                </div>
                <div style="text-align: right;">
                  <p><strong>Member Code:</strong> ${member.member_code}</p>
                  <p><strong>Member Name:</strong> ${member.name}</p>
                  <p><strong>Plan Details:</strong> ${member.plans?.name || 'Active Package'}</p>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Line Item</th>
                    <th style="text-align: right;">Amount Paid</th>
                    <th style="text-align: right;">Dues Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Membership Plan Fee - ${member.plans?.name || 'Basic'}</td>
                    <td style="text-align: right;">₹${invoice.amount_paid}</td>
                    <td style="text-align: right;">₹${invoice.amount_due}</td>
                  </tr>
                  <tr style="font-weight: bold; background-color: #faf5ff;">
                    <td>Total Invoice Value (Incl. SGST/CGST)</td>
                    <td style="text-align: right; color: #6b21a8;">₹${invoice.total}</td>
                    <td style="text-align: right;">₹${invoice.amount_due}</td>
                  </tr>
                </tbody>
              </table>
            ` : '<p>No invoices logged for this renewal cycle.</p>'}
          </div>

          <div class="section" style="margin-top: 40px;">
            <h2>2. BMI & Fitness Assessments</h2>
            <div class="bmi-badge">
              <div class="grid">
                <div>
                  <p style="margin: 0;"><strong>Current Height:</strong> ${member.height_cm || '-'} cm</p>
                  <p style="margin: 5px 0 0 0;"><strong>Current Weight:</strong> ${member.weight_kg || '-'} kg</p>
                </div>
                <div>
                  <p style="margin: 0;"><strong>Assessed BMI:</strong> ${member.bmi || '-'}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Fitness Level:</strong> <span style="text-transform: capitalize;">${member.fitness_level || 'Beginner'}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Page 2: Personalized Nutrition Diet Chart -->
        <div class="page-break">
          <h2>3. Assigned Daily Nutrition Diet</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: -10px;">Plan: ${member.diet_charts?.name || 'Standard Plan'}</p>
          ${member.diet_charts?.meals && member.diet_charts.meals.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 120px;">Time / Slot</th>
                  <th style="width: 150px;">Meal Category</th>
                  <th>Menu Items & Portions</th>
                </tr>
              </thead>
              <tbody>
                ${member.diet_charts.meals.map((m: any) => `
                  <tr>
                    <td><strong>${m.time}</strong></td>
                    <td><span style="color: #6b21a8; font-weight: 600;">${m.meal_name}</span></td>
                    <td>
                      <ul class="item-list">
                        ${m.items?.map((it: any) => `
                          <li>${it.name} - ${it.qty} (${it.calories} kcal, ${it.protein}g protein)</li>
                        `).join('')}
                      </ul>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p style="color: #6b7280; font-style: italic;">No specific diet chart assigned.</p>'}
        </div>

        <!-- Page 3: Personal Exercise Schedule -->
        <div>
          <h2>4. Assigned Training Workouts</h2>
          <p style="color: #6b7280; font-size: 12px; margin-top: -10px;">Routine: ${member.exercise_charts?.name || 'General Routine'}</p>
          ${member.exercise_charts?.days && member.exercise_charts.days.length > 0 ? `
            ${member.exercise_charts.days.map((d: any) => `
              <div style="margin-bottom: 20px;">
                <h4 style="color: #581c87; border-bottom: 1px solid #f3e8ff; padding-bottom: 5px; margin-bottom: 10px;">${d.day}</h4>
                <table style="margin-top: 5px;">
                  <thead>
                    <tr>
                      <th style="width: 200px;">Exercise Name</th>
                      <th style="width: 80px; text-align: center;">Sets</th>
                      <th style="width: 100px; text-align: center;">Reps</th>
                      <th style="width: 100px; text-align: center;">Rest</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${d.exercises?.map((ex: any) => `
                      <tr>
                        <td><strong>${ex.name}</strong></td>
                        <td style="text-align: center;">${ex.sets}</td>
                        <td style="text-align: center;">${ex.reps}</td>
                        <td style="text-align: center;">${ex.rest_seconds}s</td>
                        <td style="color: #4b5563; font-style: italic;">${ex.notes || '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `).join('')}
          ` : '<p style="color: #6b7280; font-style: italic;">No specific workout schedule assigned.</p>'}
        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline';",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error('Error generating consolidated document:', err);
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}
