import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateInteractiveTableHTML } from '@/lib/export/interactive-html-export';
import {
  computeInvoiceDigest,
  generateDigitalSignatureStamp,
  verifyInvoiceDigest,
  type InvoiceSignPayload,
} from '@/lib/billing/pfx-signer';
import { ListmonkClient } from '@/lib/marketing/listmonk';

describe('Zerodha Tech Inspired Integrations', () => {
  describe('csvtotable Inspired Interactive HTML Exporter', () => {
    it('generates a self-contained offline HTML table report', () => {
      const headers = ['Member Name', 'Phone', 'Plan', 'Amount (INR)'];
      const rows = [
        ['Rahul Sharma', '+919876543210', 'Annual Gold', 15000],
        ['Priya Patel', '+919812345678', 'Monthly Silver', 2500],
        ['Amit Singh', '+919988776655', '3-Month Cardio', 6000],
      ];

      const html = generateInteractiveTableHTML({
        title: 'Monthly Fee Collection',
        subtitle: 'October 2026 Batch',
        headers,
        rows,
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Monthly Fee Collection');
      expect(html).toContain('October 2026 Batch');
      expect(html).toContain('Rahul Sharma');
      expect(html).toContain('15000');
      expect(html).toContain('searchInput');
      expect(html).toContain('dataTable');
      expect(html).toContain('Zerodha csvtotable');
    });

    it('escapes special characters to prevent XSS in exported reports', () => {
      const headers = ['Header <script>alert(1)</script>'];
      const rows = [['<img src=x onerror=alert(2)>']];

      const html = generateInteractiveTableHTML({
        title: 'Security <Test>',
        headers,
        rows,
      });

      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(html).toContain('&lt;img src=x onerror=alert(2)&gt;');
    });
  });

  describe('pfxsigner Inspired Digital Invoice Signer', () => {
    const samplePayload: InvoiceSignPayload = {
      invoiceNumber: 'INV-2026-0042',
      gymId: 'gym-001',
      gymName: 'Iron Fitness',
      gstin: '29ABCDE1234F1Z5',
      memberId: 'mem-101',
      memberName: 'Vikram Malhotra',
      totalAmount: 18000.5,
      date: '2026-10-10',
    };

    it('computes a deterministic SHA-256 invoice digest', () => {
      const digest1 = computeInvoiceDigest(samplePayload);
      const digest2 = computeInvoiceDigest(samplePayload);

      expect(digest1).toBe(digest2);
      expect(digest1).toHaveLength(64); // 256 bits = 64 hex characters
    });

    it('generates a compliant digital signature stamp badge', () => {
      const stamp = generateDigitalSignatureStamp(samplePayload, 'Iron Fitness Management');

      expect(stamp.signedBy).toBe('Iron Fitness Management');
      expect(stamp.gstin).toBe('29ABCDE1234F1Z5');
      expect(stamp.algorithm).toBe('SHA-256');
      expect(stamp.badgeText).toContain('Digitally Signed by Iron Fitness Management');
      expect(stamp.badgeText).toContain('29ABCDE1234F1Z5');
      expect(stamp.compliance).toContain('Indian IT Act 2000');
    });

    it('verifies valid digests and rejects tampered invoice payloads', () => {
      const validDigest = computeInvoiceDigest(samplePayload);
      expect(verifyInvoiceDigest(samplePayload, validDigest)).toBe(true);

      const tamperedPayload = { ...samplePayload, totalAmount: 99999.0 };
      expect(verifyInvoiceDigest(tamperedPayload, validDigest)).toBe(false);
    });
  });

  describe('listmonk Marketing Client', () => {
    let client: ListmonkClient;

    beforeEach(() => {
      client = new ListmonkClient({
        baseUrl: 'http://localhost:9000',
        username: 'admin',
        password: 'password123',
      });
      vi.restoreAllMocks();
    });

    it('performs health check against Listmonk service', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9000/api/health', expect.any(Object));
    });

    it('syncs gym members to Listmonk lists', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/lists')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                results: [{ id: 42, name: 'Active Members', type: 'public' }],
              },
            }),
          });
        }
        if (url.includes('/api/subscribers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { id: 101 } }),
          });
        }
        return Promise.resolve({ ok: false });
      });
      global.fetch = mockFetch;

      const members = [
        { email: 'member1@gym.com', name: 'Member One', planName: 'Gold', status: 'active' },
        { email: 'member2@gym.com', name: 'Member Two', planName: 'Silver', status: 'active' },
        { email: 'invalid-email', name: 'Member Three' },
      ];

      const result = await client.syncGymMembers(members, 'Active Members');

      expect(result.total).toBe(3);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('Invalid email');
    });
  });
});
