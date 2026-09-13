export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatDateTime(date?: string | Date | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const last10 = cleaned.slice(-10);
    return `+91 ${last10.slice(0, 2)}******${last10.slice(8)}`;
  }
  return '******';
}

export function formatMemberCode(count: number): string {
  return 'GYM' + String(count).padStart(4, '0');
}

export function formatInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'GY';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GY';
  return parts
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDaysRemaining(endDate?: string | Date | null): number {
  if (!endDate) return 0;
  try {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return 0;
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi <= 0) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function calculateGST(subtotal: number, discountAmount: number = 0): { cgst: number; sgst: number; total: number } {
  const safeSubtotal = Math.max(0, subtotal || 0);
  const safeDiscount = Math.max(0, discountAmount || 0);
  const taxableAmount = Math.max(0, safeSubtotal - safeDiscount);
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  return {
    cgst,
    sgst,
    total: taxableAmount + cgst + sgst,
  };
}
