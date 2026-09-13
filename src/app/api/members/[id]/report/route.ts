import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateMemberReportHTML } from '@/lib/pdf/member-report-template';
import { MemberReportData } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const memberId = id;

    // Fetch member details using admin client
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      console.error('Member fetch error:', memberError);
      return new NextResponse('Member not found', { status: 404 });
    }

    // Fetch gym details using admin client
    const { data: gymProfile } = await supabaseAdmin
      .from('gyms')
      .select('*')
      .eq('id', member.gym_id)
      .single();

    // Fetch branch details if member has branch_id
    let branchData: any = null;
    if (member.branch_id) {
      const { data: branch } = await supabaseAdmin
        .from('branches')
        .select('*')
        .eq('id', member.branch_id)
        .maybeSingle();
      branchData = branch;
    }

    const rawGymName = gymProfile?.name?.trim() || gymProfile?.business_name?.trim() || '';
    const resolvedGymName = (rawGymName && rawGymName !== 'Gym Name' && rawGymName !== 'Gym Center')
      ? rawGymName
      : 'Fitness Club';

    const activeAddress = branchData?.address && Object.keys(branchData.address).length > 0
      ? branchData.address
      : gymProfile?.address;

    let addressStr = '';
    if (typeof activeAddress === 'string') {
      addressStr = activeAddress;
    } else if (activeAddress && typeof activeAddress === 'object') {
      addressStr = [activeAddress.street, activeAddress.city, activeAddress.state, activeAddress.pin || activeAddress.postal_code].filter(Boolean).join(', ');
    }
    if (!addressStr) addressStr = 'Facility Address Registered';

    const gymData = {
      name: resolvedGymName,
      tagline: gymProfile?.tagline || '',
      branchName: branchData?.name,
      address: addressStr,
      phone: branchData?.phone || gymProfile?.phone || 'N/A',
      email: branchData?.email || gymProfile?.email || 'N/A',
      gstin: gymProfile?.gstin,
    };

    // For a real implementation, you would fetch attendance, plans, and invoices here.
    // For this boilerplate, we'll use mocked stats if not available in the DB.
    
    const templateData: MemberReportData = {
      gym: {
        name: gymData.name,
        tagline: gymData.tagline,
        branchName: gymData.branchName,
        address: gymData.address,
        phone: gymData.phone,
        email: gymData.email,
        gstin: gymData.gstin,
      },
      member: {
        id: member.id,
        name: member.name || 'Unknown',
        phone: member.phone || 'N/A',
        email: member.email,
        joinDate: member.joined_at || new Date().toISOString(),
        status: member.status === 'active' ? 'ACTIVE' : (member.status === 'expired' ? 'EXPIRED' : 'INACTIVE'),
        bloodGroup: member.blood_group,
        height: member.height,
        weight: member.weight,
        bmi: member.bmi,
      },
      reportDate: new Date().toISOString(),
      attendanceStats: {
        totalDays: 45, // Mock data
        presentDaysThisMonth: 12, // Mock data
        currentStreak: 3, // Mock data
      },
      planHistory: [
        {
          planName: 'Annual Membership',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Active',
          amount: 15000,
        }
      ],
      paymentSummary: {
        totalPaid: 15000,
        totalPending: 0,
      }
    };

    const html = generateMemberReportHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="member-report-${member.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate member report PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
