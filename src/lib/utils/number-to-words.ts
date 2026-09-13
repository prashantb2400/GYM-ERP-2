/**
 * Converts numbers into words using the Indian Numbering System (Crore, Lakh, Thousand, Hundred).
 * Ideal for GST invoices, receipts, and commercial billing.
 * 
 * Example:
 * 15400 -> "Rupees Fifteen Thousand Four Hundred Only"
 * 125000.50 -> "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n: number): string {
  let result = '';

  if (n >= 100) {
    result += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }

  if (n >= 20) {
    result += TENS[Math.floor(n / 10)] + ' ';
    n %= 10;
  }

  if (n > 0) {
    result += ONES[n] + ' ';
  }

  return result.trim();
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Zero Rupees Only';
  }

  const rounded = Math.round(amount * 100) / 100;
  if (rounded === 0) {
    return 'Zero Rupees Only';
  }

  const isNegative = rounded < 0;
  const absAmount = Math.abs(rounded);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise > 0) {
    return `${isNegative ? 'Minus ' : ''}${convertBelowThousand(paise)} Paise Only`;
  }

  let crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;

  let hundredPart = remainder;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertBelowThousand(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertBelowThousand(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertBelowThousand(thousand)} Thousand`);
  }
  if (hundredPart > 0) {
    parts.push(convertBelowThousand(hundredPart));
  }

  let words = parts.join(' ').trim();
  if (!words) {
    words = 'Zero';
  }

  let result = `${isNegative ? 'Minus ' : ''}Rupees ${words}`;

  if (paise > 0) {
    result += ` and ${convertBelowThousand(paise)} Paise`;
  }

  return `${result} Only`;
}
