import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { gymId, memberId, amount, purpose = 'Membership Renewal' } = await request.json();

    if (!gymId || !amount) {
      return NextResponse.json({ error: 'Missing gymId or amount' }, { status: 400 });
    }

    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('name, business_name, phone, settings')
      .eq('id', gymId)
      .single();

    const payeeName = gym?.business_name || gym?.name || 'Gym Center';
    // Use gym custom UPI VPA from settings or construct default
    const payeeVpa = (gym?.settings as any)?.upi_vpa || (gym?.phone ? `${gym.phone}@upi` : 'gymerp@upi');
    const transactionRef = `TXN${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;
    const note = `${purpose.slice(0, 30)} - ${transactionRef}`;

    // Standard NPCI Bharat UPI deep-link URI specification
    const upiUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${Number(amount).toFixed(2)}&tr=${transactionRef}&tn=${encodeURIComponent(note)}&cu=INR`;

    return NextResponse.json({
      success: true,
      upiUri,
      payeeVpa,
      payeeName,
      amount: Number(amount),
      transactionRef,
      note,
    });
  } catch (err: any) {
    console.error('Kiosk UPI QR error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate UPI QR' }, { status: 500 });
  }
}
