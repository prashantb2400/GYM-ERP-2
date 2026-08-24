export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export function formatMemberCode(count: number): string {
  return 'GYM' + String(count).padStart(4, '0');
}

export function formatInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getDaysRemaining(endDate: string | Date): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function calculateGST(
  amount: number,
  discountAmount: number = 0,
  isInclusive: boolean = false
): { baseAmount: number; cgst: number; sgst: number; total: number } {
  let baseAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let total = 0;

  if (isInclusive) {
    const discountedAmount = amount - discountAmount;
    baseAmount = Math.round((discountedAmount / 1.18) * 100) / 100;
    cgst = Math.round(baseAmount * 0.09 * 100) / 100;
    sgst = Math.round(baseAmount * 0.09 * 100) / 100;
    total = discountedAmount;
  } else {
    baseAmount = amount - discountAmount;
    cgst = Math.round(baseAmount * 0.09 * 100) / 100;
    sgst = Math.round(baseAmount * 0.09 * 100) / 100;
    total = baseAmount + cgst + sgst;
  }

  return {
    baseAmount,
    cgst,
    sgst,
    total,
  };
}
