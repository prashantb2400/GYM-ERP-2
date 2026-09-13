import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInvoiceHTML } from '@/lib/pdf/invoice-template';
import { InvoiceData, InvoiceItem } from '@/lib/pdf/types';
import { numberToIndianWords } from '@/lib/utils/number-to-words';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const invoiceId = id;

    // Fetch invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, members(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError);
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Fetch gym details
    const { data: gymProfile } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', invoice.gym_id)
      .single();

    // Fetch branch details if invoice has branch_id
    let branchData: any = null;
    if (invoice.branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('*')
        .eq('id', invoice.branch_id)
        .maybeSingle();
      branchData = branch;
    }

    const gymData = gymProfile || {
      name: 'Gym Center',
      tagline: '',
      address: {},
      phone: '',
      email: '',
      settings: {},
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
