import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateInvoiceHTML } from '@/lib/pdf/invoice-template';
import { InvoiceData, InvoiceItem, InvoiceFitnessBlueprint } from '@/lib/pdf/types';
import { numberToIndianWords } from '@/lib/utils/number-to-words';
import { getDietChoiceLabel, getFitnessLevelLabel } from '@/lib/fitness/plan-generator';
import { getBMICategory } from '@/lib/utils/format';


import { getAuthUser } from '@/lib/server/auth-helper';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authErr } = await getAuthUser(request);
    if (!user || authErr) {
      return new NextResponse('Unauthorized: Valid session required to view invoice', { status: 401 });
    }

    const { id } = await params;
    const invoiceId = id;

    // Fetch invoice details using supabaseAdmin to bypass RLS for PDF printouts
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*, members(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Verify caller has permission: either staff/owner in the same gym or the member themselves
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

    const isOwnerOrStaff = callerUser && callerUser.gym_id === invoice.gym_id;
    const isSelf = callerMember && callerMember.id === invoice.member_id;

    if (!isOwnerOrStaff && !isSelf) {
      // Also check if user owns the gym
      const { data: ownedGym } = await supabaseAdmin
        .from('gyms')
        .select('id')
        .eq('id', invoice.gym_id)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!ownedGym) {
        return new NextResponse('Forbidden: You do not have access to this invoice', { status: 403 });
      }
    }

    // Fetch gym details
    const { data: gymProfile } = await supabaseAdmin
      .from('gyms')
      .select('*')
      .eq('id', invoice.gym_id)
      .single();

    // Fetch branch details if invoice has branch_id
    let branchData: any = null;
    if (invoice.branch_id) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('*')
        .eq('id', invoice.branch_id)
        .maybeSingle();
      branchData = branch;
    }

    const resolvedGymName = (gymProfile?.name?.trim() && gymProfile.name !== 'Gym Center')
      ? gymProfile.name.trim()
      : (gymProfile?.business_name?.trim() || 'Fitness Club');

    const gymData = {
      name: resolvedGymName,
      tagline: gymProfile?.tagline || '',
      address: gymProfile?.address || {},
      phone: gymProfile?.phone || '',
      email: gymProfile?.email || '',
      gstin: gymProfile?.gstin || '',
      pan: gymProfile?.pan || '',
      settings: gymProfile?.settings || {},
    };

    // Format address prioritizing specific branch address then gym address
    const activeAddress = branchData?.address && Object.keys(branchData.address).length > 0
      ? branchData.address
      : gymData.address;

    let addressStr = '';
    if (typeof activeAddress === 'string') {
      addressStr = activeAddress;
    } else if (activeAddress && typeof activeAddress === 'object') {
      const parts = [
        activeAddress.street,
        activeAddress.city,
        activeAddress.state,
        activeAddress.pin ? `PIN: ${activeAddress.pin}` : '',
      ].filter(Boolean);
      addressStr = parts.join(', ');
    }
    if (!addressStr) {
      addressStr = 'Facility Address Registered';
    }

    // Convert line items
    const items: InvoiceItem[] = Array.isArray(invoice.line_items)
      ? invoice.line_items.map((item: any) => ({
          description: item.description || 'Gym Membership / Personal Training Service',
          hsnCode: item.hsnCode || '999723',
          qty: Number(item.qty) || 1,
          rate: Number(item.rate) || Number(item.amount) || 0,
          amount: Number(item.amount) || 0,
        }))
      : [];

    const totalAmount = Number(invoice.total) || 0;
    const amountPaid = Number(invoice.amount_paid) || 0;
    const amountDue = Number(invoice.amount_due) || 0;

    // Fetch member's diet and exercise charts if available
    let dietChart: any = null;
    let exerciseChart: any = null;
    const memberObj = invoice.members;

    if (memberObj?.diet_chart_id) {
      const { data: dc } = await supabaseAdmin
        .from('diet_charts')
        .select('*')
        .eq('id', memberObj.diet_chart_id)
        .maybeSingle();
      dietChart = dc;
    }

    if (memberObj?.exercise_chart_id) {
      const { data: ec } = await supabaseAdmin
        .from('exercise_charts')
        .select('*')
        .eq('id', memberObj.exercise_chart_id)
        .maybeSingle();
      exerciseChart = ec;
    }

    // Build Fitness Blueprint if chart or fitness goals exist
    let fitnessBlueprint: InvoiceFitnessBlueprint | undefined = undefined;
    if (dietChart || exerciseChart || memberObj?.fitness_level || memberObj?.bmi || (memberObj?.health_goals && memberObj.health_goals.length > 0)) {
      const dietChoice = dietChart?.diet_choice || 'vegetarian';
      const dietChoiceLabel = getDietChoiceLabel(dietChoice);
      const fitnessLevel = exerciseChart?.fitness_level || memberObj?.fitness_level || 'beginner';
      const fitnessLevelLabel = getFitnessLevelLabel(fitnessLevel);

      const mealsArr = Array.isArray(dietChart?.meals) ? dietChart.meals : [];
      const mealsSummary = mealsArr.map((m: any) => ({
        name: m.meal_name || m.name || 'Meal',
        time: m.time,
        highlight: Array.isArray(m.items) ? m.items.map((i: any) => typeof i === 'string' ? i : i.name).slice(0, 2).join(', ') : '',
      }));

      const daysArr = Array.isArray(exerciseChart?.days) ? exerciseChart.days : [];
      const workoutDaysSummary = daysArr.map((d: any) => ({
        day: d.day || 'Training Day',
        focus: Array.isArray(d.exercises) ? d.exercises.map((e: any) => e.name).slice(0, 2).join(', ') : (d.focus || 'Active Training'),
      }));

      const safeBmi = Number(memberObj?.bmi) || 0;
      const primaryGoal = Array.isArray(memberObj?.health_goals) && memberObj.health_goals.length > 0
        ? memberObj.health_goals[0]
        : 'Fitness & Health';

      fitnessBlueprint = {
        dietName: dietChart?.name || `${memberObj?.name || 'Member'}'s Nutrition Plan`,
        dietChoice,
        dietChoiceLabel,
        targetCalories: dietChart?.target_calories || (safeBmi >= 25 ? 1950 : 2250),
        targetProtein: dietChart?.total_protein || (safeBmi >= 25 ? 135 : 125),
        mealsSummary: mealsSummary.length > 0 ? mealsSummary : undefined,
        workoutName: exerciseChart?.name || `${memberObj?.name || 'Member'}'s Training Protocol`,
        fitnessLevel,
        fitnessLevelLabel,
        daysPerWeek: exerciseChart?.days_per_week || (daysArr.length > 0 ? daysArr.length : (fitnessLevel === 'advanced' ? 5 : (fitnessLevel === 'intermediate' ? 4 : 3))),
        targetGoal: primaryGoal,
        bmi: safeBmi > 0 ? safeBmi : null,
        bmiCategory: getBMICategory(safeBmi),
        workoutDaysSummary: workoutDaysSummary.length > 0 ? workoutDaysSummary : undefined,
      };
    }

    // Map to standard template data
    const templateData: InvoiceData = {
      gym: {
        name: gymData.name,
        tagline: gymData.tagline,
        branchName: branchData?.name,
        address: addressStr,
        phone: branchData?.phone || gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
        gstin: gymData.gstin,
        pan: gymData.pan,
        upiId: gymData.settings?.upi_id || branchData?.settings?.upi_id,
      },
      member: {
        id: invoice.member_id || 'UNKNOWN',
        memberCode: invoice.members?.member_code || invoice.member_id?.slice(0, 8),
        name: invoice.member_name || invoice.members?.name || 'Walk-in Member',
        phone: invoice.members?.phone || 'N/A',
        email: invoice.members?.email || '',
        address: invoice.members?.address || '',
      },
      invoiceNo: invoice.invoice_number || invoice.id.slice(0, 8),
      date: invoice.issued_at || new Date().toISOString(),
      dueDate: invoice.due_date,
      items: items,
      subtotal: Number(invoice.subtotal) || totalAmount,
      discountAmount: Number(invoice.discount_amount) || 0,
      cgstAmount: Number(invoice.cgst_amount) || 0,
      sgstAmount: Number(invoice.sgst_amount) || 0,
      totalAmount: totalAmount,
      amountPaid: amountPaid,
      amountDue: amountDue,
      paymentMode: invoice.payment_mode || (amountDue <= 0 ? 'UPI / Cash' : 'Pending'),
      cashierName: 'Front Desk Cashier',
      status: invoice.status === 'paid' || amountDue <= 0 ? 'PAID' : (amountDue > 0 ? 'PENDING' : 'PAID'),
      amountInWords: numberToIndianWords(totalAmount),
      fitnessBlueprint,
    };


    const html = generateInvoiceHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${templateData.invoiceNo}.pdf"`,
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; sandbox allow-popups;",
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
