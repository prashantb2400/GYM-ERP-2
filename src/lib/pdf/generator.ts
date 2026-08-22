import { InvoiceData } from './types';

/**
 * PDF Generation Service
 * 
 * TODO: For production PDF rendering (e.g. for WhatsApp attachments),
 * add `puppeteer-core` and `@sparticuz/chromium` to package.json for Next.js/Vercel support.
 * 
 * Example Implementation:
 * import puppeteer from 'puppeteer-core';
 * import chromium from '@sparticuz/chromium';
 * 
 * export async function generatePdfBuffer(html: string): Promise<Buffer> {
 *   const browser = await puppeteer.launch({
 *     args: chromium.args,
 *     defaultViewport: chromium.defaultViewport,
 *     executablePath: await chromium.executablePath(),
 *     headless: chromium.headless,
 *   });
 *   const page = await browser.newPage();
 *   await page.setContent(html, { waitUntil: 'networkidle0' });
 *   const pdf = await page.pdf({ format: 'A4', printBackground: true });
 *   await browser.close();
 *   return pdf;
 * }
 */

/**
 * Stub for sending WhatsApp messages with PDF attachments.
 * Replace this with your actual WhatsApp API provider integration (e.g., Twilio, Meta API).
 */
export async function sendPdfViaWhatsApp(phone: string, pdfUrlOrBuffer: string | Buffer, intent: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true, messageId: `mock-id-${Date.now()}` };
}

function pdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, '?').replace(/([\\()])/g, '\\$1');
}

export function generateInvoicePdf(data: InvoiceData): Buffer {
  const lines = [
    data.gym.name,
    data.gym.address,
    `Phone: ${data.gym.phone}  Email: ${data.gym.email}`,
    `Invoice: ${data.invoiceNo}  Date: ${data.date}`,
    `Bill to: ${data.member.name} (${data.member.phone})`,
    '',
    ...data.items.map((item) => `${item.description}  ${item.amount.toFixed(2)}`),
    '',
    `Subtotal: ${data.subtotal.toFixed(2)}`,
    `CGST: ${data.cgstAmount.toFixed(2)}  SGST: ${data.sgstAmount.toFixed(2)}`,
    `Total: ${data.totalAmount.toFixed(2)}  Status: ${data.status}`,
  ];
  const commands = ['BT', '/F1 11 Tf', '50 780 Td', ...lines.flatMap((line) => [`(${pdfText(line)}) Tj`, '0 -18 Td']), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

export function generateTextPdf(lines: string[]): Buffer {
  return generateInvoicePdf({
    gym: { name: lines[0] || 'GymERP', address: '', phone: '', email: '' },
    invoiceNo: 'DOCUMENT',
    date: new Date().toISOString(),
    member: { id: '', name: '', phone: '' },
    items: lines.slice(1).map((description) => ({ description, amount: 0 })),
    subtotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    totalAmount: 0,
    status: 'PAID',
    amountInWords: '',
  });
}
