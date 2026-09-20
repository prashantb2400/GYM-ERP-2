/**
 * Multi-Protocol Printer Driver for Android Kiosk.
 * Supports ESC-POS 80mm Thermal Receipt Printers, A4 Document Spooling, and LAN Bridge.
 */

export interface InvoicePrintPayload {
  invoiceNumber: string;
  gymName: string;
  gymAddress?: string;
  gymGstin?: string;
  gymPhone?: string;
  memberName: string;
  memberCode: string;
  memberPhone?: string;
  date: string;
  planName: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  paymentMode: string;
  qrToken?: string;
}

export interface BlueprintPrintPayload {
  memberName: string;
  goal: string;
  caloricTarget: number;
  macros: { proteinGrams: number; carbsGrams: number; fatsGrams: number };
  dietMeals: Array<{ meal_name: string; time: string; items: Array<{ name: string; qty: string }> }>;
  workoutDays: Array<{ day: string; exercises: Array<{ name: string; sets: number; reps: string }> }>;
}

class KioskPrinterDriver {
  /**
   * Generates ESC-POS byte commands string for 80mm thermal receipt printer.
   */
  public generateEscPosReceipt(invoice: InvoicePrintPayload): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    // ESC @ (Initialize printer)
    parts.push(0x1b, 0x40);

    // ESC a 1 (Center align)
    parts.push(0x1b, 0x61, 0x01);

    // ESC ! 0x30 (Double height + Double width)
    parts.push(0x1b, 0x21, 0x30);
    this.addAscii(parts, `${invoice.gymName}\n`);

    // ESC ! 0x00 (Normal font)
    parts.push(0x1b, 0x21, 0x00);
    if (invoice.gymAddress) this.addAscii(parts, `${invoice.gymAddress}\n`);
    if (invoice.gymPhone) this.addAscii(parts, `Phone: ${invoice.gymPhone}\n`);
    if (invoice.gymGstin) this.addAscii(parts, `GSTIN: ${invoice.gymGstin}\n`);

    this.addAscii(parts, '------------------------------------------------\n');
    this.addAscii(parts, '           TAX INVOICE & MEMBERSHIP PASS        \n');
    this.addAscii(parts, '------------------------------------------------\n');

    // ESC a 0 (Left align)
    parts.push(0x1b, 0x61, 0x00);
    this.addAscii(parts, `Invoice No : ${invoice.invoiceNumber}\n`);
    this.addAscii(parts, `Date       : ${invoice.date}\n`);
    this.addAscii(parts, `Member     : ${invoice.memberName} (${invoice.memberCode})\n`);
    if (invoice.memberPhone) this.addAscii(parts, `Phone      : ${invoice.memberPhone}\n`);
    this.addAscii(parts, '------------------------------------------------\n');

    // Item Table
    this.addAscii(parts, `Plan: ${invoice.planName}\n`);
    this.addAscii(parts, `Base Amount          : Rs. ${invoice.subtotal.toFixed(2)}\n`);
    if (invoice.cgst > 0) this.addAscii(parts, `CGST (9%)            : Rs. ${invoice.cgst.toFixed(2)}\n`);
    if (invoice.sgst > 0) this.addAscii(parts, `SGST (9%)            : Rs. ${invoice.sgst.toFixed(2)}\n`);
    this.addAscii(parts, '------------------------------------------------\n');

    // Bold Total
    parts.push(0x1b, 0x45, 0x01); // Bold on
    this.addAscii(parts, `TOTAL PAID           : Rs. ${invoice.total.toFixed(2)}\n`);
    parts.push(0x1b, 0x45, 0x00); // Bold off
    this.addAscii(parts, `Payment Mode         : ${invoice.paymentMode.toUpperCase()}\n`);
    this.addAscii(parts, '------------------------------------------------\n');

    // ESC a 1 (Center align)
    parts.push(0x1b, 0x61, 0x01);
    this.addAscii(parts, 'Scan your pass QR at the turnstile:\n\n');

    // GS V 66 0 (Cut paper)
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  private addAscii(parts: number[], text: string) {
    for (let i = 0; i < text.length; i++) {
      parts.push(text.charCodeAt(i) & 0x7f);
    }
  }

  /**
   * Spools multi-page printable HTML document for Android PrintManager.
   */
  public printA4Package(invoice: InvoicePrintPayload, blueprint?: BlueprintPrintPayload) {
    if (typeof window === 'undefined') return;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';

    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GymERP Print Packet - ${invoice.memberName}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; line-height: 1.4; }
          .page-break { page-break-after: always; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
          h1, h2, h3 { margin-top: 0; color: #111827; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .table th, .table td { border-bottom: 1px solid #e5e7eb; padding: 8px 4px; text-align: left; font-size: 13px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; background: #e0e7ff; color: #3730a3; font-weight: bold; font-size: 11px; }
        </style>
      </head>
      <body>
        <!-- PAGE 1: INVOICE & MEMBERSHIP PASS -->
        <div class="page-break">
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3730a3; padding-bottom: 12px;">
              <div>
                <h2>${invoice.gymName}</h2>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">${invoice.gymAddress || ''}</p>
              </div>
              <div style="text-align: right;">
                <span class="badge">PAID</span>
                <p style="font-size: 12px; font-family: monospace; margin: 4px 0 0 0;">${invoice.invoiceNumber}</p>
              </div>
            </div>

            <div class="grid" style="margin-top: 16px;">
              <div>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">Billed To:</p>
                <strong>${invoice.memberName}</strong>
                <p style="font-size: 12px; font-family: monospace; margin: 2px 0;">ID: ${invoice.memberCode}</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 12px; color: #6b7280; margin: 0;">Invoice Date:</p>
                <strong>${invoice.date}</strong>
                <p style="font-size: 12px; margin: 2px 0;">Payment: ${invoice.paymentMode.toUpperCase()}</p>
              </div>
            </div>

            <table class="table" style="margin-top: 24px;">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Membership Plan: ${invoice.planName}</td>
                  <td style="text-align: right;">Rs. ${invoice.subtotal.toFixed(2)}</td>
                </tr>
                ${invoice.cgst > 0 ? `<tr><td>CGST (9%)</td><td style="text-align: right;">Rs. ${invoice.cgst.toFixed(2)}</td></tr>` : ''}
                ${invoice.sgst > 0 ? `<tr><td>SGST (9%)</td><td style="text-align: right;">Rs. ${invoice.sgst.toFixed(2)}</td></tr>` : ''}
                <tr style="font-size: 16px; font-weight: bold; border-top: 2px solid #111;">
                  <td>Total Paid</td>
                  <td style="text-align: right;">Rs. ${invoice.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PAGE 2: PERSONALIZED NUTRITION BLUEPRINT -->
        ${blueprint ? `
        <div class="page-break">
          <div class="card">
            <h2>Personalized Nutrition Blueprint</h2>
            <p style="color: #6b7280; font-size: 13px;">Targeting ${blueprint.caloricTarget} kcal daily | Protein: ${blueprint.macros.proteinGrams}g | Carbs: ${blueprint.macros.carbsGrams}g | Fats: ${blueprint.macros.fatsGrams}g</p>
            
            ${blueprint.dietMeals.map((m) => `
              <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                <strong style="color: #3730a3;">${m.meal_name} (${m.time})</strong>
                <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 13px;">
                  ${m.items.map((it) => `<li>${it.name} - <em>${it.qty}</em></li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- PAGE 3: 6-DAY WORKOUT SPLIT -->
        <div>
          <div class="card">
            <h2>Personalized 6-Day Workout Routine</h2>
            <p style="color: #6b7280; font-size: 13px;">Goal: ${blueprint.goal.toUpperCase()}</p>
            
            <div class="grid">
              ${blueprint.workoutDays.map((d) => `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
                  <strong style="color: #059669; font-size: 13px;">${d.day}</strong>
                  <table style="width: 100%; font-size: 11px; margin-top: 6px;">
                    ${d.exercises.map((ex) => `
                      <tr>
                        <td>${ex.name}</td>
                        <td style="text-align: right; font-weight: bold;">${ex.sets} x ${ex.reps}</td>
                      </tr>
                    `).join('')}
                  </table>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 2000);
    }, 500);
  }

  /**
   * Sends print payload to local hardware bridge (if running on LAN).
   */
  public async sendToHardwareBridge(escPosData: Uint8Array): Promise<boolean> {
    try {
      const res = await fetch('http://127.0.0.1:8080/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: escPosData as unknown as BodyInit,
      });
      return res.ok;
    } catch {
      return false; // Silently fallback to browser print if bridge is not running
    }
  }
}

export const kioskPrinter = new KioskPrinterDriver();
