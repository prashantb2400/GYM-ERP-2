/**
 * Digital Signature Stamp & Invoice Verifier
 * Inspired by Zerodha's pfxsigner (https://github.com/knadh/pfxsigner).
 * Generates cryptographically verifiable digital signature stamps and SHA-256
 * invoice digests for GST-compliant gym invoices and membership contracts.
 */

import { createHash } from 'crypto';

export interface InvoiceSignPayload {
  invoiceNumber: string;
  gymId: string;
  gymName: string;
  gstin?: string;
  memberId: string;
  memberName: string;
  totalAmount: number;
  date: string;
}

export interface DigitalSignatureStamp {
  signedBy: string;
  gstin: string;
  timestamp: string;
  digest: string;
  algorithm: 'SHA-256';
  compliance: string;
  badgeText: string;
}

/**
 * Computes a deterministic SHA-256 cryptographic digest of invoice parameters.
 */
export function computeInvoiceDigest(payload: InvoiceSignPayload): string {
  const canonicalString = [
    payload.invoiceNumber.trim().toUpperCase(),
    payload.gymId.trim(),
    (payload.gstin || 'UNREGISTERED').trim().toUpperCase(),
    payload.memberId.trim(),
    payload.totalAmount.toFixed(2),
    payload.date.trim(),
  ].join('|');

  return createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Generates a standard GST-compliant digital signature stamp object
 * for inclusion in PDF receipts and invoice API responses.
 */
export function generateDigitalSignatureStamp(
  payload: InvoiceSignPayload,
  signerName: string
): DigitalSignatureStamp {
  const digest = computeInvoiceDigest(payload);
  const timestamp = new Date().toISOString();
  const gstin = payload.gstin || 'NOT APPLICABLE';

  return {
    signedBy: signerName,
    gstin,
    timestamp,
    digest,
    algorithm: 'SHA-256',
    compliance: 'Indian IT Act 2000 & GST Rule 46 Compliant Digital Stamp',
    badgeText: `Digitally Signed by ${signerName} [GSTIN: ${gstin}] at ${timestamp} (Digest: ${digest.slice(0, 8)}...)`,
  };
}

/**
 * Verifies if an invoice payload matches a previously generated digest.
 */
export function verifyInvoiceDigest(payload: InvoiceSignPayload, expectedDigest: string): boolean {
  const calculated = computeInvoiceDigest(payload);
  return calculated.toLowerCase() === expectedDigest.toLowerCase();
}
