import * as XLSX from 'xlsx';

export interface RawParsedRow {
  [key: string]: any;
}

export interface ParsedMemberRow {
  rowNumber: number;
  name: string;
  phone: string;
  whatsapp_phone?: string;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string; // YYYY-MM-DD
  blood_group?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  emergency_name?: string;
  emergency_phone?: string;
  plan_name?: string;
  plan_start_date?: string; // YYYY-MM-DD
  plan_end_date?: string; // YYYY-MM-DD
  admission_date?: string; // YYYY-MM-DD
  status?: 'active' | 'expired' | 'pending' | 'frozen';
  total_due?: number;
  total_paid_lifetime?: number;
  locker_number?: string;
  member_code?: string;
  raw: RawParsedRow;
}

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: any;
}

export interface ParseResult {
  totalRows: number;
  validRows: ParsedMemberRow[];
  invalidRows: {
    rowNumber: number;
    errors: RowValidationError[];
    raw: RawParsedRow;
  }[];
  duplicatePhonesInFile: string[];
}

/**
 * Normalizes an arbitrary header string by trimming, lowercasing, and removing punctuation.
 */
export function normalizeHeaderKey(header: string): string {
  return String(header || '')
    .toLowerCase()
    .replace(/[_\-\/\s\(\)\*#]/g, '')
    .trim();
}

/**
 * Dictionary of known aliases for column headers.
 */
const HEADER_ALIASES: Record<keyof Omit<ParsedMemberRow, 'rowNumber' | 'raw'>, string[]> = {
  name: ['name', 'fullname', 'membername', 'clientname', 'customername', 'member'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact', 'contactno', 'contactnumber', 'cell', 'cellphone'],
  whatsapp_phone: ['whatsapp', 'whatsappphone', 'whatsappnumber', 'wanumber', 'waphone'],
  email: ['email', 'emailaddress', 'mail', 'mailid'],
  gender: ['gender', 'sex'],
  dob: ['dob', 'dateofbirth', 'birthdate', 'birthday'],
  blood_group: ['bloodgroup', 'blood', 'bg'],
  address: ['address', 'street', 'residence', 'addressline', 'residentialaddress'],
  city: ['city', 'town'],
  state: ['state', 'province'],
  pin: ['pin', 'pincode', 'postalcode', 'zip', 'zipcode'],
  emergency_name: ['emergencycontactname', 'emergencyname', 'guardianname', 'parentname', 'kinname'],
  emergency_phone: ['emergencycontactphone', 'emergencycontact', 'emergencyphone', 'guardianphone'],
  plan_name: ['plan', 'planname', 'membershipplan', 'membershiptype', 'package', 'packagename', 'scheme'],
  plan_start_date: ['planstartdate', 'planstart', 'startdate', 'membershipstart', 'joiningdate', 'validfrom'],
  plan_end_date: ['planenddate', 'planend', 'enddate', 'membershipend', 'expirydate', 'validtill', 'validto'],
  admission_date: ['admissiondate', 'membersince', 'joinedon', 'createdat', 'admission'],
  status: ['status', 'membershipstatus', 'memberstatus', 'state'],
  total_due: ['totaldue', 'due', 'dueamount', 'pendingdue', 'pendingamount', 'balance', 'balanceamount'],
  total_paid_lifetime: ['totalpaid', 'paidamount', 'feespaid', 'amountpaid', 'paid'],
  locker_number: ['lockernumber', 'locker', 'lockerno'],
  member_code: ['membercode', 'memberid', 'code', 'regno', 'registrationno', 'membershipid'],
};

/**
 * Maps Excel row keys to standardized member fields.
 */
export function mapRowToStandardFields(row: RawParsedRow): Partial<ParsedMemberRow> {
  const mapped: any = {};
  const rowKeys = Object.keys(row);

  for (const rawKey of rowKeys) {
    const normKey = normalizeHeaderKey(rawKey);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(normKey)) {
        mapped[field] = row[rawKey];
        break;
      }
    }
  }

  return mapped;
}

/**
 * Sanitizes phone numbers by stripping country codes, spaces, and punctuation to extract standard 10-digit format.
 */
export function sanitizePhoneNumber(phone: any): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  // If 11 digits starting with 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  // If 12 digits starting with 91 (e.g. +91 9876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/**
 * Parses date inputs from Excel (handles Date objects, Excel serial day numbers, and standard string formats).
 * Returns ISO Date string (YYYY-MM-DD) or null.
 */
export function parseExcelDate(dateVal: any): string | null {
  if (!dateVal && dateVal !== 0) return null;

  // 1. JavaScript Date instance
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return dateVal.toISOString().split('T')[0];
  }

  // 2. Numeric Excel serial date (e.g. 45306)
  if (typeof dateVal === 'number' && dateVal > 25000 && dateVal < 70000) {
    try {
      // Excel epoch: Dec 30, 1899
      const jsDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    } catch {
      // Ignore serial date parse error
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // 3. YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/.]/);
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 4. DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(str)) {
    const parts = str.split(/[-/.]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // 5. Fallback Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Normalizes gender input.
 */
export function normalizeGender(gender: any): 'male' | 'female' | 'other' | undefined {
  if (!gender) return undefined;
  const g = String(gender).trim().toLowerCase();
  if (g.startsWith('m')) return 'male';
  if (g.startsWith('f')) return 'female';
  if (g.startsWith('o')) return 'other';
  return undefined;
}

/**
 * Normalizes status input.
 */
export function normalizeStatus(status: any): 'active' | 'expired' | 'pending' | 'frozen' {
  if (!status) return 'active';
  const s = String(status).trim().toLowerCase();
  if (s.includes('exp')) return 'expired';
  if (s.includes('pend')) return 'pending';
  if (s.includes('froz')) return 'frozen';
  if (s.includes('canc')) return 'expired';
  return 'active';
}

/**
 * Parses and validates an array of raw Excel rows into typed member objects with error diagnostics.
 */
export function validateAndParseRows(rawRows: RawParsedRow[]): ParseResult {
  const validRows: ParsedMemberRow[] = [];
  const invalidRows: { rowNumber: number; errors: RowValidationError[]; raw: RawParsedRow }[] = [];
  const seenPhones = new Map<string, number>(); // phone -> first row seen
  const duplicatePhonesInFile: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 2; // Row 1 is header
    const mapped = mapRowToStandardFields(row);
    const errors: RowValidationError[] = [];

    // 1. Mandatory Name Validation
    const name = String(mapped.name || '').trim();
    if (!name) {
      errors.push({
        rowNumber,
        field: 'name',
        message: 'Member name is required and cannot be empty.',
      });
    }

    // 2. Mandatory Phone Validation
    const rawPhone = mapped.phone;
    const cleanPhone = sanitizePhoneNumber(rawPhone);
    if (!cleanPhone) {
      errors.push({
        rowNumber,
        field: 'phone',
        message: `Invalid phone number "${rawPhone || ''}". Must be a valid 10-digit mobile number.`,
        value: rawPhone,
      });
    } else {
      if (seenPhones.has(cleanPhone)) {
        if (!duplicatePhonesInFile.includes(cleanPhone)) {
          duplicatePhonesInFile.push(cleanPhone);
        }
        errors.push({
          rowNumber,
          field: 'phone',
          message: `Duplicate phone number in file (first seen at row ${seenPhones.get(cleanPhone)}).`,
          value: cleanPhone,
        });
      } else {
        seenPhones.set(cleanPhone, rowNumber);
      }
    }

    // 3. Email Validation (if provided)
    let cleanEmail: string | undefined = undefined;
    if (mapped.email) {
      const emailStr = String(mapped.email).trim().toLowerCase();
      if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        errors.push({
          rowNumber,
          field: 'email',
          message: `Invalid email format "${emailStr}".`,
          value: emailStr,
        });
      } else if (emailStr) {
        cleanEmail = emailStr;
      }
    }

    // 4. Dates
    const dob = mapped.dob ? parseExcelDate(mapped.dob) : undefined;
    const planStartDate = mapped.plan_start_date ? parseExcelDate(mapped.plan_start_date) : undefined;
    const planEndDate = mapped.plan_end_date ? parseExcelDate(mapped.plan_end_date) : undefined;
    const admissionDate = mapped.admission_date
      ? parseExcelDate(mapped.admission_date)
      : (planStartDate || new Date().toISOString().split('T')[0]);

    if (mapped.dob && !dob) {
      errors.push({
        rowNumber,
        field: 'dob',
        message: `Could not parse Date of Birth "${mapped.dob}". Use YYYY-MM-DD or DD-MM-YYYY.`,
        value: mapped.dob,
      });
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        errors,
        raw: row,
      });
    } else {
      validRows.push({
        rowNumber,
        name,
        phone: cleanPhone!,
        whatsapp_phone: mapped.whatsapp_phone ? sanitizePhoneNumber(mapped.whatsapp_phone) || cleanPhone! : cleanPhone!,
        email: cleanEmail,
        gender: normalizeGender(mapped.gender),
        dob: dob || undefined,
        blood_group: mapped.blood_group ? String(mapped.blood_group).trim().toUpperCase() : undefined,
        address: mapped.address ? String(mapped.address).trim() : undefined,
        city: mapped.city ? String(mapped.city).trim() : undefined,
        state: mapped.state ? String(mapped.state).trim() : undefined,
        pin: mapped.pin ? String(mapped.pin).trim() : undefined,
        emergency_name: mapped.emergency_name ? String(mapped.emergency_name).trim() : undefined,
        emergency_phone: mapped.emergency_phone ? sanitizePhoneNumber(mapped.emergency_phone) || undefined : undefined,
        plan_name: mapped.plan_name ? String(mapped.plan_name).trim() : undefined,
        plan_start_date: planStartDate || new Date().toISOString().split('T')[0],
        plan_end_date: planEndDate || undefined,
        admission_date: admissionDate || new Date().toISOString().split('T')[0],
        status: normalizeStatus(mapped.status),
        total_due: Number(mapped.total_due) > 0 ? Number(mapped.total_due) : 0,
        total_paid_lifetime: Number(mapped.total_paid_lifetime) > 0 ? Number(mapped.total_paid_lifetime) : 0,
        locker_number: mapped.locker_number ? String(mapped.locker_number).trim() : undefined,
        member_code: mapped.member_code ? String(mapped.member_code).trim() : undefined,
        raw: row,
      });
    }
  }

  return {
    totalRows: rawRows.length,
    validRows,
    invalidRows,
    duplicatePhonesInFile,
  };
}

/**
 * Parses raw ArrayBuffer or File from Excel/CSV input into ParseResult.
 */
export function parseExcelFileBuffer(data: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicatePhonesInFile: [],
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: RawParsedRow[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: true,
  });

  return validateAndParseRows(rawRows);
}
