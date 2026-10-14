import { describe, it, expect } from 'vitest';
import {
  WA_TEMPLATES,
  getTemplateByName,
  formatWhatsAppPhone,
  buildWhatsAppWebUrl,
  renderTemplateText,
} from '@/lib/whatsapp/templates';

describe('WhatsApp Lifecycle Notification & Template Engine', () => {
  describe('Template Catalog Integrity', () => {
    it('defines all required lifecycle templates', () => {
      expect(WA_TEMPLATES.WELCOME_PASS).toBeDefined();
      expect(WA_TEMPLATES.EXPIRY_REMINDER_7DAY).toBeDefined();
      expect(WA_TEMPLATES.EXPIRY_REMINDER_3DAY).toBeDefined();
      expect(WA_TEMPLATES.EXPIRY_REMINDER_1DAY).toBeDefined();
      expect(WA_TEMPLATES.DUE_PAYMENT_REMINDER).toBeDefined();
      expect(WA_TEMPLATES.ATTENDANCE_CHECKIN).toBeDefined();
      expect(WA_TEMPLATES.BIRTHDAY_GREETING).toBeDefined();
      expect(WA_TEMPLATES.EXERCISE_PLAN_SENT).toBeDefined();
    });

    it('ensures each template has valid metadata and variables', () => {
      Object.entries(WA_TEMPLATES).forEach(([key, template]) => {
        expect(template.name).toBeTruthy();
        expect(['MARKETING', 'UTILITY', 'AUTHENTICATION']).toContain(template.category);
        expect(template.language).toBe('en');
        expect(Array.isArray(template.variables)).toBe(true);
        expect(template.body).toBeTruthy();
        expect(template.body.length).toBeGreaterThan(10);
      });
    });
  });

  describe('getTemplateByName', () => {
    it('resolves templates by dictionary key', () => {
      const template = getTemplateByName('WELCOME_PASS');
      expect(template).not.toBeNull();
      expect(template?.name).toBe('welcome_pass');
    });

    it('resolves templates by Meta template name', () => {
      const template = getTemplateByName('welcome_pass');
      expect(template).not.toBeNull();
      expect(template?.variables).toContain('pass_url');
    });

    it('returns null for unknown template identifier', () => {
      const template = getTemplateByName('non_existent_template_xyz');
      expect(template).toBeNull();
    });
  });

  describe('formatWhatsAppPhone', () => {
    it('prepends 91 to 10-digit Indian numbers', () => {
      expect(formatWhatsAppPhone('9876543210')).toBe('919876543210');
      expect(formatWhatsAppPhone('(987) 654-3210')).toBe('919876543210');
    });

    it('preserves numbers that already include country code', () => {
      expect(formatWhatsAppPhone('919876543210')).toBe('919876543210');
      expect(formatWhatsAppPhone('+91 98765 43210')).toBe('919876543210');
      expect(formatWhatsAppPhone('14155552671')).toBe('14155552671');
    });
  });

  describe('buildWhatsAppWebUrl', () => {
    it('creates properly encoded wa.me link', () => {
      const url = buildWhatsAppWebUrl('9876543210', 'Hello from GymERP!');
      expect(url).toContain('https://wa.me/919876543210?text=');
      expect(url).toContain('Hello%20from%20GymERP!');
    });
  });

  describe('renderTemplateText', () => {
    it('renders WELCOME_PASS with indexed array parameters', () => {
      const rendered = renderTemplateText('welcome_pass', [
        'Marcus Vance',
        'Titan Elite Gym',
        'MEM-902',
        'https://gymerp.app/pass/m902',
      ]);
      expect(rendered).toContain('Welcome Marcus Vance to Titan Elite Gym!');
      expect(rendered).toContain('Your Member ID is MEM-902.');
      expect(rendered).toContain('https://gymerp.app/pass/m902');
    });

    it('renders EXPIRY_REMINDER_3DAY with named parameters', () => {
      const rendered = renderTemplateText('EXPIRY_REMINDER_3DAY', {
        member_name: 'Sarah Connor',
        plan_name: 'CrossFit Quarterly',
        gym_name: 'MetroFlex Gym',
      });
      expect(rendered).toContain('Hi Sarah Connor');
      expect(rendered).toContain('CrossFit Quarterly');
      expect(rendered).toContain('MetroFlex Gym');
      expect(rendered).toContain('expires in 3 days');
    });

    it('renders DUE_PAYMENT_REMINDER with amount and due date', () => {
      const rendered = renderTemplateText('DUE_PAYMENT_REMINDER', {
        member_name: 'David Goggins',
        amount: '3500',
        due_date: 'Oct 25, 2026',
        gym_name: 'Badwater Fitness',
      });
      expect(rendered).toContain('Hi David Goggins');
      expect(rendered).toContain('Rs 3500');
      expect(rendered).toContain('Oct 25, 2026');
      expect(rendered).toContain('Badwater Fitness');
    });

    it('renders ATTENDANCE_CHECKIN with check-in timestamp', () => {
      const rendered = renderTemplateText('ATTENDANCE_CHECKIN', {
        member_name: 'John Doe',
        gym_name: 'Gold Gym',
        checkin_time: '06:15 AM',
      });
      expect(rendered).toContain('Hi John Doe');
      expect(rendered).toContain('check-in confirmed at Gold Gym on 06:15 AM');
    });

    it('gracefully handles missing template with fallback formatting', () => {
      const rendered = renderTemplateText('custom_unknown', {
        foo: 'bar',
      });
      expect(rendered).toContain('[custom_unknown]');
      expect(rendered).toContain('foo: bar');
    });
  });
});
