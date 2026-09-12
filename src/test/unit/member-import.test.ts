import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizeHeaderKey,
  mapRowToStandardFields,
  sanitizePhoneNumber,
  parseExcelDate,
  normalizeGender,
  normalizeStatus,
  validateAndParseRows,
  parseExcelFileBuffer,
} from '@/lib/members/excel-parser';

describe('Member Excel Parser & Validator', () => {
  describe('Header Normalization & Key Mapping', () => {
    it('normalizes arbitrary column headers into clean keys', () => {
      expect(normalizeHeaderKey('Full Name *')).toBe('fullname');
      expect(normalizeHeaderKey('Phone Number (Mobile)')).toBe('phonenumbermobile');
      expect(normalizeHeaderKey('Date_Of_Birth')).toBe('dateofbirth');
      expect(normalizeHeaderKey('E-mail #')).toBe('email');
    });

    it('maps varied user aliases to canonical member properties', () => {
      const rawRow = {
        'Member Name': 'Ankit Verma',
        'Mobile Number': '9876543210',
        'WhatsApp Phone': '9876543210',
        'Mail ID': 'ankit@example.com',
        'Date of Birth': '1995-10-25',
        'Membership Plan': 'Gold Annual',
        'Total Due': '1500',
      };

      const mapped = mapRowToStandardFields(rawRow);
      expect(mapped.name).toBe('Ankit Verma');
      expect(mapped.phone).toBe('9876543210');
      expect(mapped.whatsapp_phone).toBe('9876543210');
      expect(mapped.email).toBe('ankit@example.com');
      expect(mapped.dob).toBe('1995-10-25');
      expect(mapped.plan_name).toBe('Gold Annual');
      expect(mapped.total_due).toBe('1500');
    });
  });

  describe('Phone Number Sanitization', () => {
    it('cleans standard 10-digit phone numbers', () => {
      expect(sanitizePhoneNumber('9876543210')).toBe('9876543210');
      expect(sanitizePhoneNumber(9876543210)).toBe('9876543210');
    });

    it('strips international +91 prefix and formatting punctuation', () => {
      expect(sanitizePhoneNumber('+91 9876543210')).toBe('9876543210');
      expect(sanitizePhoneNumber('+91-98765-43210')).toBe('9876543210');
      expect(sanitizePhoneNumber('09876543210')).toBe('9876543210');
    });

    it('rejects invalid or too-short phone numbers', () => {
      expect(sanitizePhoneNumber('12345')).toBeNull();
      expect(sanitizePhoneNumber('abcdefghij')).toBeNull();
      expect(sanitizePhoneNumber('')).toBeNull();
      expect(sanitizePhoneNumber(null)).toBeNull();
    });
  });

  describe('Date Parsing', () => {
    it('parses ISO format YYYY-MM-DD', () => {
      expect(parseExcelDate('2026-05-14')).toBe('2026-05-14');
      expect(parseExcelDate('2026/05/14')).toBe('2026-05-14');
    });

    it('parses Indian DD-MM-YYYY and DD/MM/YYYY formats', () => {
      expect(parseExcelDate('14-05-2026')).toBe('2026-05-14');
      expect(parseExcelDate('14/05/2026')).toBe('2026-05-14');
    });

    it('parses numeric Excel serial date numbers', () => {
      // Excel serial 45306 = ~ Jan 15, 2024
      const parsed = parseExcelDate(45306);
      expect(parsed).toMatch(/^2024-01-1[45]$/); // timezone tolerance
    });

    it('returns null for unparseable dates', () => {
      expect(parseExcelDate('not-a-date')).toBeNull();
      expect(parseExcelDate('')).toBeNull();
      expect(parseExcelDate(null)).toBeNull();
    });
  });

  describe('Enums Normalization', () => {
    it('normalizes gender strings', () => {
      expect(normalizeGender('Male')).toBe('male');
      expect(normalizeGender('M')).toBe('male');
      expect(normalizeGender('female')).toBe('female');
      expect(normalizeGender('F')).toBe('female');
      expect(normalizeGender('Other')).toBe('other');
      expect(normalizeGender('unknown')).toBeUndefined();
    });

    it('normalizes membership status', () => {
      expect(normalizeStatus('Active')).toBe('active');
      expect(normalizeStatus('EXPIRED')).toBe('expired');
      expect(normalizeStatus('pending')).toBe('pending');
      expect(normalizeStatus('frozen')).toBe('frozen');
      expect(normalizeStatus('')).toBe('active'); // default
    });
  });

  describe('Row Validation & Deduplication', () => {
    it('validates a complete, correctly formatted member row', () => {
      const rows = [
        {
          'Full Name': 'Suresh Raina',
          'Phone': '9876543210',
          'Email': 'suresh@example.com',
          'Date of Birth': '1986-11-27',
          'Plan': 'Monthly Pro',
          'Due': 500,
        },
      ];

      const result = validateAndParseRows(rows);
      expect(result.totalRows).toBe(1);
      expect(result.validRows.length).toBe(1);
      expect(result.invalidRows.length).toBe(0);

      const member = result.validRows[0];
      expect(member.name).toBe('Suresh Raina');
      expect(member.phone).toBe('9876543210');
      expect(member.email).toBe('suresh@example.com');
      expect(member.dob).toBe('1986-11-27');
      expect(member.plan_name).toBe('Monthly Pro');
      expect(member.total_due).toBe(500);
      expect(member.status).toBe('active');
    });

    it('rejects rows with missing name or invalid phone', () => {
      const rows = [
        { 'Full Name': '', 'Phone': '9876543210' }, // Missing name
        { 'Full Name': 'Vikas Kumar', 'Phone': '123' }, // Bad phone
        { 'Full Name': 'Deepak Lal', 'Phone': '9811122233', 'Email': 'not-an-email' }, // Bad email
      ];

      const result = validateAndParseRows(rows);
      expect(result.validRows.length).toBe(0);
      expect(result.invalidRows.length).toBe(3);
      expect(result.invalidRows[0].errors[0].field).toBe('name');
      expect(result.invalidRows[1].errors[0].field).toBe('phone');
      expect(result.invalidRows[2].errors[0].field).toBe('email');
    });

    it('flags duplicate phone numbers within the same file', () => {
      const rows = [
        { 'Full Name': 'Person A', 'Phone': '9876543210' },
        { 'Full Name': 'Person B', 'Phone': '9876543210' }, // Duplicate
      ];

      const result = validateAndParseRows(rows);
      expect(result.validRows.length).toBe(1); // Person A is accepted
      expect(result.invalidRows.length).toBe(1); // Person B is flagged
      expect(result.duplicatePhonesInFile).toContain('9876543210');
      expect(result.invalidRows[0].errors[0].message).toContain('Duplicate phone number in file');
    });
  });

  describe('End-to-End Workbook Buffer Parsing', () => {
    it('creates an in-memory XLSX workbook and parses it cleanly', () => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Full Name *', 'Phone Number *', 'Email', 'Plan Name', 'Status'],
        ['Kavita Devi', '9988776655', 'kavita@test.com', 'Annual Gold', 'active'],
        ['Manish Pandey', '9911223344', '', 'Quarterly', 'expired'],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Members');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const result = parseExcelFileBuffer(buffer);

      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(2);
      expect(result.validRows[0].name).toBe('Kavita Devi');
      expect(result.validRows[0].phone).toBe('9988776655');
      expect(result.validRows[1].name).toBe('Manish Pandey');
      expect(result.validRows[1].status).toBe('expired');
    });
  });
});
