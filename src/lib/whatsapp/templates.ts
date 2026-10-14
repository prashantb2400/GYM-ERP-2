export interface WhatsAppTemplateDefinition {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  variables: string[];
  body: string;
  description?: string;
}

export const WA_TEMPLATES: Record<string, WhatsAppTemplateDefinition> = {
  GYM_WELCOME: {
    name: 'gym_welcome',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Welcome {{1}} to {{2}}! We are thrilled to have you.',
    description: 'Sent immediately upon member enrollment',
  },
  WELCOME_PASS: {
    name: 'welcome_pass',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name', 'member_code', 'pass_url'],
    body: 'Welcome {{1}} to {{2}}! Your Member ID is {{3}}. View your workout plan & digital gym pass here: {{4}}',
    description: 'Express onboarding digital welcome pass with login credentials',
  },
  MEMBERSHIP_RENEWAL: {
    name: 'membership_renewal',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name', 'gym_name'],
    body: 'Hi {{1}}, your {{2}} plan at {{3}} has been successfully renewed.',
    description: 'Triggered when a membership renewal payment is recorded',
  },
  EXPIRY_REMINDER_7DAY: {
    name: 'expiry_reminder_7day',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name', 'gym_name'],
    body: 'Hi {{1}}, your {{2}} plan at {{3}} is expiring in 7 days.',
    description: 'Automated 7-day advance expiry warning via nightly cron',
  },
  EXPIRY_REMINDER_3DAY: {
    name: 'expiry_reminder_3day',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name', 'gym_name'],
    body: 'Hi {{1}}, your {{2}} membership at {{3}} expires in 3 days. Renew early to maintain uninterrupted access.',
    description: 'Automated 3-day urgent expiry notice via cron',
  },
  EXPIRY_REMINDER_1DAY: {
    name: 'expiry_reminder_1day',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name', 'gym_name'],
    body: 'Hi {{1}}, your {{2}} plan at {{3}} expires tomorrow.',
    description: 'Final 24-hour expiry reminder alert',
  },
  DUE_PAYMENT_REMINDER: {
    name: 'due_payment_reminder',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'amount', 'due_date', 'gym_name'],
    body: 'Hi {{1}}, this is a reminder for a pending payment of Rs {{2}} due on {{3}} at {{4}}.',
    description: 'Fee collection reminder with outstanding balance',
  },
  ATTENDANCE_CHECKIN: {
    name: 'attendance_checkin',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name', 'checkin_time'],
    body: 'Hi {{1}}, check-in confirmed at {{2}} on {{3}}. Have an energetic workout!',
    description: 'Instant notification on biometric or kiosk check-in',
  },
  BIRTHDAY_GREETING: {
    name: 'birthday_greeting',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Happy Birthday {{1}}! Best wishes from the {{2}} family.',
    description: 'Automated birthday celebration greeting',
  },
  ANNIVERSARY_GREETING: {
    name: 'anniversary_greeting',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Happy Workversary/Anniversary {{1}}! Keep crushing it at {{2}}.',
    description: 'Member milestone and anniversary greetings',
  },
  KYC_VERIFIED: {
    name: 'kyc_verified',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name'],
    body: 'Hi {{1}}, your KYC documents have been successfully verified.',
    description: 'Identity verification approval alert',
  },
  KYC_REJECTED: {
    name: 'kyc_rejected',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'reason'],
    body: 'Hi {{1}}, your KYC was rejected. Reason: {{2}}. Please resubmit.',
    description: 'Notice for rejected identification documents',
  },
  DIET_CHART_SENT: {
    name: 'diet_chart_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Hi {{1}}, your new diet chart from {{2}} is attached.',
    description: 'Nutrition blueprint delivery alert',
  },
  EXERCISE_PLAN_SENT: {
    name: 'exercise_plan_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Hi {{1}}, your new exercise plan from {{2}} is ready.',
    description: 'Personalized training routine dispatch',
  },
  INVOICE_SENT: {
    name: 'invoice_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'invoice_id'],
    body: 'Hi {{1}}, please find attached your invoice {{2}}.',
    description: 'Tax invoice and payment receipt delivery',
  },
  REVIEW_REQUEST: {
    name: 'review_request',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name', 'link'],
    body: 'Hi {{1}}, how is your experience at {{2}}? Leave us a review: {{3}}',
    description: 'Post-workout Google reviews generation prompt',
  },
  PROMO_BROADCAST: {
    name: 'promo_broadcast',
    category: 'MARKETING',
    language: 'en',
    variables: ['promo_details', 'validity'],
    body: 'Special Offer: {{1}}. Valid until {{2}}.',
    description: 'Promotional announcement broadcast',
  },
  GENERAL_UPDATE: {
    name: 'general_update',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'update_message'],
    body: 'Hi {{1}}, important update: {{2}}',
    description: 'Facility maintenance or emergency schedule changes',
  },
};

/**
 * Retrieve a template definition by key or template name.
 */
export function getTemplateByName(nameOrKey: string): WhatsAppTemplateDefinition | null {
  if (WA_TEMPLATES[nameOrKey]) return WA_TEMPLATES[nameOrKey];
  const found = Object.values(WA_TEMPLATES).find((t) => t.name === nameOrKey);
  return found || null;
}

/**
 * Format an Indian or international phone number for WhatsApp wa.me links.
 */
export function formatWhatsAppPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `91${clean}`;
  }
  return clean;
}

/**
 * Build a direct WhatsApp Web / app intent link.
 */
export function buildWhatsAppWebUrl(phone: string, text: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Render a template body replacing variable placeholders.
 * Supports both indexed placeholders ({{1}}, {{2}}) and named objects ({ member_name, gym_name }).
 */
export function renderTemplateText(
  templateNameOrKey: string,
  params: Record<string, string | number> | (string | number)[]
): string {
  const template = getTemplateByName(templateNameOrKey);
  if (!template) {
    if (Array.isArray(params)) {
      return `[${templateNameOrKey}] ${params.join(', ')}`;
    }
    return `[${templateNameOrKey}] ${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }

  let text = template.body;

  if (Array.isArray(params)) {
    params.forEach((val, idx) => {
      text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), String(val));
    });
  } else {
    // Replace by variable name order
    template.variables.forEach((varName, idx) => {
      const val = params[varName] !== undefined ? params[varName] : params[String(idx + 1)] ?? '';
      text = text.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), String(val));
      text = text.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), String(val));
    });

    // Also replace any direct named tags if present
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }

  return text;
}
