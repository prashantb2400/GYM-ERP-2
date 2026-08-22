import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTextPdf } from '@/lib/pdf/generator';
import { MemberReportData } from '@/lib/pdf/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const memberId = id;

    // Fetch member details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      console.error('Member fetch error:', memberError);
      return new NextResponse('Member not found', { status: 404 });
    }

    // Fetch gym profile
    const { data: gymProfile } = await supabase
      .from('gyms')
      .select('*')
      .limit(1)
      .single();

    const gymData = gymProfile || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com'
    };

    // For a real implementation, you would fetch attendance, plans, and invoices here.
    // For this boilerplate, we'll use mocked stats if not available in the DB.
    
    const templateData: MemberReportData = {
      gym: {
        name: gymData.name,
        address: `${gymData.address?.street || ''} ${gymData.address?.city || ''} ${gymData.address?.state || ''} ${gymData.address?.pin || ''}`.trim() || gymData.address || 'Address not provided',
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
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

    const pdf = generateTextPdf([
      `${templateData.gym.name} - Member Report`,
      `Member: ${templateData.member.name}`,
      `Status: ${templateData.member.status}`,
      `Report date: ${templateData.reportDate}`,
    ]);

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="member-report-${member.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate member report PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
