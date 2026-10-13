/**
 * Multi-Protocol Printer Driver for Android Kiosk & Front Desk PC.
 * Supports ESC-POS 80mm/58mm Thermal Receipt Printers, A4 Spooling, Native QR Commands, and Direct WebUSB.
 */

export type PrinterPaperWidth = 58 | 80;

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
  paperWidth?: PrinterPaperWidth;
}

export interface BlueprintPrintPayload {
  memberName: string;
  goal: string;
  caloricTarget: number;
  macros: { proteinGrams: number; carbsGrams: number; fatsGrams: number };
  dietMeals: Array<{ meal_name: string; time: string; items: Array<{ name: string; qty: string }> }>;
  workoutDays: Array<{ day: string; exercises: Array<{ name: string; sets: number; reps: string }> }>;
}

export interface CheckInSlipPayload {
  gymName: string;
  gymAddress?: string;
  gymPhone?: string;
  branchName?: string;
  memberName: string;
  memberCode: string;
  checkInTime: string;
  date: string;
  daysRemaining?: number;
  planName?: string;
  lockerNumber?: string;
  qrCodeData?: string;
  qrPassData?: string;
  workout?: {
    routineName?: string;
    dayName: string;
    exercises: Array<{ name: string; sets?: number | string; reps?: string | number; targetWeightKg?: number }>;
  };
  quote?: string;
  paperWidth?: PrinterPaperWidth;
}

export interface WorkoutSlipPayload {
  gymName: string;
  memberName: string;
  memberCode?: string;
  date: string;
  routineName: string;
  dayName: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string | number;
    targetWeightKg?: number;
    restSeconds?: number;
    notes?: string;
  }>;
  plateCalc?: {
    barbellWeightKg: number;
    targetWeightKg: number;
    platesPerSide: string;
  };
  paperWidth?: PrinterPaperWidth;
}

export function getLineWidth(paperWidth: PrinterPaperWidth = 80): number {
  return paperWidth === 58 ? 32 : 48;
}

export function getDividerLine(paperWidth: PrinterPaperWidth = 80): string {
  const width = getLineWidth(paperWidth);
  return '-'.repeat(width) + '\n';
}

export function formatTwoColumns(left: string = '', right: string = '', paperWidth: PrinterPaperWidth = 80): string {
  const l = left ?? '';
  const r = right ?? '';
  const width = getLineWidth(paperWidth);
  const totalLength = l.length + r.length;
  if (totalLength >= width) {
    const maxLeftLen = Math.max(1, width - r.length - 1);
    const truncatedLeft = l.slice(0, maxLeftLen);
    const spaces = ' '.repeat(Math.max(1, width - truncatedLeft.length - r.length));
    return `${truncatedLeft}${spaces}${r}\n`;
  }
  const spaces = ' '.repeat(width - totalLength);
  return `${l}${spaces}${r}\n`;
}

class KioskPrinterDriver {
  /**
   * Generates ESC-POS byte commands for 80mm or 58mm thermal receipt printers.
   */
  public generateEscPosReceipt(invoice: InvoicePrintPayload): Uint8Array {
    const paperWidth = invoice.paperWidth || 80;
    const divider = getDividerLine(paperWidth);
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

    this.addAscii(parts, divider);
    this.addAscii(parts, '     TAX INVOICE & MEMBERSHIP PASS     \n');
    this.addAscii(parts, divider);

    // ESC a 0 (Left align)
    parts.push(0x1b, 0x61, 0x00);
    this.addAscii(parts, formatTwoColumns('Invoice No:', invoice.invoiceNumber, paperWidth));
    this.addAscii(parts, formatTwoColumns('Date:', invoice.date, paperWidth));
    this.addAscii(parts, formatTwoColumns('Member:', invoice.memberName, paperWidth));
    this.addAscii(parts, formatTwoColumns('Member ID:', invoice.memberCode, paperWidth));
    if (invoice.memberPhone) {
      this.addAscii(parts, formatTwoColumns('Phone:', invoice.memberPhone, paperWidth));
    }
    this.addAscii(parts, divider);

    // Item Table
    this.addAscii(parts, `Plan: ${invoice.planName}\n`);
    this.addAscii(parts, formatTwoColumns('Base Amount:', `Rs. ${invoice.subtotal.toFixed(2)}`, paperWidth));
    if (invoice.cgst > 0) {
      this.addAscii(parts, formatTwoColumns('CGST (9%):', `Rs. ${invoice.cgst.toFixed(2)}`, paperWidth));
    }
    if (invoice.sgst > 0) {
      this.addAscii(parts, formatTwoColumns('SGST (9%):', `Rs. ${invoice.sgst.toFixed(2)}`, paperWidth));
    }
    this.addAscii(parts, divider);

    // Bold Total
    parts.push(0x1b, 0x45, 0x01); // Bold on
    this.addAscii(parts, formatTwoColumns('TOTAL PAID:', `Rs. ${invoice.total.toFixed(2)}`, paperWidth));
    parts.push(0x1b, 0x45, 0x00); // Bold off
    this.addAscii(parts, formatTwoColumns('Payment Mode:', invoice.paymentMode.toUpperCase(), paperWidth));
    this.addAscii(parts, divider);

    // Turnstile QR Code (if provided)
    if (invoice.qrToken) {
      parts.push(0x1b, 0x61, 0x01); // Center
      this.addAscii(parts, 'Scan your pass QR at the gate:\n\n');
      this.addEscPosQrCode(parts, invoice.qrToken, paperWidth === 58 ? 3 : 4);
      this.addAscii(parts, '\n');
    }

    // GS V 66 0 (Cut paper)
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  /**
   * Generates a compact thermal attendance slip with optional split prescription & QR pass.
   */
  public generateEscPosCheckInSlip(slip: CheckInSlipPayload): Uint8Array {
    const paperWidth = slip.paperWidth || 80;
    const divider = getDividerLine(paperWidth);
    const parts: number[] = [];

    // ESC @ (Initialize)
    parts.push(0x1b, 0x40);

    // Center align
    parts.push(0x1b, 0x61, 0x01);

    // Double height + width for Gym Name
    parts.push(0x1b, 0x21, 0x30);
    this.addAscii(parts, `${slip.gymName}\n`);

    // Normal font
    parts.push(0x1b, 0x21, 0x00);
    if (slip.branchName) this.addAscii(parts, `${slip.branchName}\n`);
    if (slip.gymPhone) this.addAscii(parts, `Tel: ${slip.gymPhone}\n`);

    this.addAscii(parts, divider);
    this.addAscii(parts, '     ATTENDANCE CHECK-IN SLIP     \n');
    this.addAscii(parts, divider);

    // Left align details
    parts.push(0x1b, 0x61, 0x00);
    this.addAscii(parts, formatTwoColumns('Member:', slip.memberName, paperWidth));
    this.addAscii(parts, formatTwoColumns('Member ID:', slip.memberCode, paperWidth));
    this.addAscii(parts, formatTwoColumns('Date:', slip.date, paperWidth));
    this.addAscii(parts, formatTwoColumns('Time:', slip.checkInTime, paperWidth));

    if (slip.lockerNumber) {
      this.addAscii(parts, formatTwoColumns('Locker #:', slip.lockerNumber, paperWidth));
    }

    if (slip.daysRemaining !== undefined) {
      const validityText = slip.daysRemaining <= 3 
        ? `EXPIRING (${slip.daysRemaining}d left)`
        : `${slip.daysRemaining} days left`;
      this.addAscii(parts, formatTwoColumns('Validity:', validityText, paperWidth));
    }

    // Today's Workout Section (if present)
    if (slip.workout && slip.workout.exercises.length > 0) {
      this.addAscii(parts, divider);
      parts.push(0x1b, 0x61, 0x01); // Center
      parts.push(0x1b, 0x45, 0x01); // Bold on
      this.addAscii(parts, `TODAY: ${slip.workout.dayName.toUpperCase()}\n`);
      parts.push(0x1b, 0x45, 0x00); // Bold off

      parts.push(0x1b, 0x61, 0x00); // Left
      for (const ex of slip.workout.exercises.slice(0, 6)) {
        const setRep = ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : '';
        this.addAscii(parts, formatTwoColumns(`* ${ex.name}`, setRep, paperWidth));
      }
    }

    this.addAscii(parts, divider);

    // Turnstile QR Code (if provided)
    const qrData = slip.qrCodeData || slip.qrPassData;
    if (qrData) {
      parts.push(0x1b, 0x61, 0x01); // Center
      this.addAscii(parts, 'Scan to pass gate / turnstile:\n\n');
      this.addEscPosQrCode(parts, qrData, paperWidth === 58 ? 3 : 4);
      this.addAscii(parts, '\n');
    }

    // Footer quote
    parts.push(0x1b, 0x61, 0x01); // Center
    const quote = slip.quote || 'Iron sharpens iron. Have a great session!';
    this.addAscii(parts, `"${quote}"\n\n\n`);

    // GS V 66 0 (Cut paper)
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  /**
   * Generates a workout floor card with checkboxes and plate calculations.
   */
  public generateEscPosWorkoutSlip(workout: WorkoutSlipPayload): Uint8Array {
    const paperWidth = workout.paperWidth || 80;
    const divider = getDividerLine(paperWidth);
    const parts: number[] = [];

    // ESC @ (Initialize)
    parts.push(0x1b, 0x40);

    // Center align
    parts.push(0x1b, 0x61, 0x01);
    parts.push(0x1b, 0x21, 0x30); // Double size
    this.addAscii(parts, `${workout.gymName}\n`);

    parts.push(0x1b, 0x21, 0x00); // Normal font
    this.addAscii(parts, divider);
    this.addAscii(parts, '       DAILY WORKOUT FLOOR CARD   \n');
    this.addAscii(parts, divider);

    parts.push(0x1b, 0x61, 0x00); // Left align
    this.addAscii(parts, formatTwoColumns('Athlete:', workout.memberName, paperWidth));
    this.addAscii(parts, formatTwoColumns('Date:', workout.date, paperWidth));
    this.addAscii(parts, formatTwoColumns('Routine:', workout.routineName, paperWidth));
    this.addAscii(parts, formatTwoColumns('Split:', workout.dayName, paperWidth));
    this.addAscii(parts, divider);

    // Exercises with set check boxes [ ]
    parts.push(0x1b, 0x45, 0x01); // Bold on
    this.addAscii(parts, formatTwoColumns('EXERCISE', 'TARGET', paperWidth));
    parts.push(0x1b, 0x45, 0x00); // Bold off

    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      const target = `${ex.sets} sets x ${ex.reps}`;
      this.addAscii(parts, `\n${i + 1}. ${ex.name}\n`);
      this.addAscii(parts, formatTwoColumns('   Goal: ' + target, ex.targetWeightKg ? `${ex.targetWeightKg}kg` : '', paperWidth));

      // Print check boxes for sets: [ ] [ ] [ ] [ ]
      const checkBoxes = Array.from({ length: Math.min(ex.sets, 6) }, () => '[ ]').join(' ');
      this.addAscii(parts, `   Sets: ${checkBoxes}\n`);
    }

    // Barbell plate calculator sleeve instructions
    if (workout.plateCalc) {
      this.addAscii(parts, divider);
      parts.push(0x1b, 0x61, 0x01); // Center
      parts.push(0x1b, 0x45, 0x01); // Bold
      this.addAscii(parts, `PLATE MATH: ${workout.plateCalc.targetWeightKg} KG BARBELL\n`);
      parts.push(0x1b, 0x45, 0x00);
      parts.push(0x1b, 0x61, 0x00); // Left
      this.addAscii(parts, `Bar: ${workout.plateCalc.barbellWeightKg}kg Olympic bar\n`);
      this.addAscii(parts, `Each Sleeve: ${workout.plateCalc.platesPerSide}\n`);
    }

    this.addAscii(parts, divider);
    parts.push(0x1b, 0x61, 0x01); // Center
    this.addAscii(parts, 'Track your training. Break your limits.\n\n\n');

    // Cut paper
    parts.push(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  /**
   * Emits ESC/POS native Model 2 QR Code commands.
   */
  public addEscPosQrCode(parts: number[], data: string, moduleSize = 4) {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const length = dataBytes.length + 3;
    const pL = length % 256;
    const pH = Math.floor(length / 256);

    // 1. Select QR Model (Model 2)
    parts.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

    // 2. Set Module Size
    const size = Math.max(2, Math.min(8, moduleSize));
    parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size);

    // 3. Set Error Correction Level (Level M: ~15%)
    parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);

    // 4. Store Data in QR Buffer
    parts.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < dataBytes.length; i++) {
      parts.push(dataBytes[i]);
    }

    // 5. Print QR Code
    parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  }

  private addAscii(parts: number[], text: string) {
    for (let i = 0; i < text.length; i++) {
      parts.push(text.charCodeAt(i) & 0x7f);
    }
  }

  /**
   * Spools printable check-in slip for browser / desktop iframe print fallback.
   */
  public printCheckInSlipA4(slip: CheckInSlipPayload) {
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

    const isSmall = slip.paperWidth === 58;
    const slipWidth = isSmall ? '58mm' : '80mm';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Check-In Slip - ${slip.memberName}</title>
        <style>
          @page { size: ${slipWidth} auto; margin: 4mm; }
          body { font-family: monospace, -apple-system, sans-serif; font-size: ${isSmall ? '10px' : '12px'}; color: #111; line-height: 1.3; width: ${slipWidth}; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #444; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .ex-list { margin: 4px 0; padding-left: 0; list-style: none; }
          .ex-list li { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px;">${slip.gymName}</div>
        ${slip.branchName ? `<div class="center">${slip.branchName}</div>` : ''}
        ${slip.gymPhone ? `<div class="center">Tel: ${slip.gymPhone}</div>` : ''}
        <div class="divider"></div>
        <div class="center bold">ATTENDANCE CHECK-IN SLIP</div>
        <div class="divider"></div>
        <div class="row"><span>Member:</span><span class="bold">${slip.memberName}</span></div>
        <div class="row"><span>ID:</span><span>${slip.memberCode}</span></div>
        <div class="row"><span>Date:</span><span>${slip.date}</span></div>
        <div class="row"><span>Time:</span><span>${slip.checkInTime}</span></div>
        ${slip.lockerNumber ? `<div class="row"><span>Locker:</span><span class="bold">${slip.lockerNumber}</span></div>` : ''}
        ${slip.daysRemaining !== undefined ? `<div class="row"><span>Validity:</span><span>${slip.daysRemaining} days left</span></div>` : ''}
        ${slip.workout ? `
          <div class="divider"></div>
          <div class="center bold">${slip.workout.dayName.toUpperCase()}</div>
          <ul class="ex-list">
            ${slip.workout.exercises.map((e) => `<li class="row"><span>* ${e.name}</span><span>${e.sets || ''}x${e.reps || ''}</span></li>`).join('')}
          </ul>
        ` : ''}
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 6px;">${slip.quote || 'Iron sharpens iron.'}</div>
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
    }, 400);
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
   * Direct WebUSB ESC/POS raw bytes transmission (Chrome/Edge on Desktop and Android).
   */
  public async directWebUsbPrint(escPosData: Uint8Array): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      return false;
    }
    try {
      const navUsb = (navigator as any).usb;
      const device = await navUsb.requestDevice({
        filters: [{ classCode: 7 }], // USB Printer class
      });
      if (!device) return false;

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      const iface = device.configuration.interfaces[0];
      const endpoint = iface.alternates[0].endpoints.find((e: any) => e.direction === 'out');
      if (!endpoint) return false;

      await device.transferOut(endpoint.endpointNumber, escPosData);
      await device.close();
      return true;
    } catch (err) {
      console.warn('WebUSB direct print error:', err);
      return false;
    }
  }

  /**
   * Sends print payload to local hardware bridge (if running on LAN).
   */
  public async sendToHardwareBridge(escPosData: Uint8Array, bridgeUrl = 'http://127.0.0.1:8080'): Promise<boolean> {
    try {
      const res = await fetch(`${bridgeUrl}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: escPosData as unknown as BodyInit,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const kioskPrinter = new KioskPrinterDriver();
