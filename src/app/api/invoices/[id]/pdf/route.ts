import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateInvoiceHTML } from '@/lib/pdf/invoice-template';
import { InvoiceData, InvoiceItem } from '@/lib/pdf/types';

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

    const gymData = gymProfile || {
      name: 'Gym Name',
      address: 'Gym Address',
      phone: '1234567890',
      email: 'contact@gym.com',
      settings: {},
    };

    // Convert line items
    const items: InvoiceItem[] = Array.isArray(invoice.line_items) 
      ? invoice.line_items.map((item: any) => ({
          description: item.description || 'Item',
          amount: Number(item.amount) || 0,
        }))
      : [];

    // Map to our standard template data
    const templateData: InvoiceData = {
      gym: {
        name: gymData.name,
        address: `${gymData.address?.street || ''} ${gymData.address?.city || ''} ${gymData.address?.state || ''} ${gymData.address?.pin || ''}`.trim() || gymData.address || 'Address not provided',
        phone: gymData.phone || 'N/A',
        email: gymData.email || 'N/A',
        gstin: gymData.gstin,
        pan: gymData.pan,
        upiId: gymData.settings?.upi_id,
      },
      member: {
        id: invoice.member_id || 'UNKNOWN',
        name: invoice.member_name || invoice.members?.name || 'Walk-in Customer',
        phone: invoice.members?.phone || 'N/A',
      },
      invoiceNo: invoice.invoice_number || invoice.id.slice(0, 8),
      date: invoice.issued_at || new Date().toISOString(),
      items: items,
      subtotal: Number(invoice.subtotal) || 0,
      cgstAmount: Number(invoice.cgst_amount) || 0,
      sgstAmount: Number(invoice.sgst_amount) || 0,
      totalAmount: Number(invoice.total) || 0,
      status: invoice.status === 'paid' || invoice.amount_due <= 0 ? 'PAID' : (invoice.amount_due > 0 ? 'PENDING' : 'PAID'),
      amountInWords: 'Amount generated electronically', // In a real app, use a library to convert number to words
    };

    const html = generateInvoiceHTML(templateData);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${templateData.invoiceNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
