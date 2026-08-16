export const WA_TEMPLATES = {
  GYM_WELCOME: {
    name: 'gym_welcome',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Welcome {{1}} to {{2}}! We are thrilled to have you.'
  },
  MEMBERSHIP_RENEWAL: {
    name: 'membership_renewal',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name', 'gym_name'],
    body: 'Hi {{1}}, your {{2}} plan at {{3}} has been successfully renewed.'
  },
  EXPIRY_REMINDER_7DAY: {
    name: 'expiry_reminder_7day',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name'],
    body: 'Hi {{1}}, your {{2}} plan is expiring in 7 days.'
  },
  EXPIRY_REMINDER_1DAY: {
    name: 'expiry_reminder_1day',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'plan_name'],
    body: 'Hi {{1}}, your {{2}} plan expires tomorrow.'
  },
  DUE_PAYMENT_REMINDER: {
    name: 'due_payment_reminder',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'amount', 'due_date'],
    body: 'Hi {{1}}, this is a reminder for a pending payment of {{2}} due on {{3}}.'
  },
  BIRTHDAY_GREETING: {
    name: 'birthday_greeting',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Happy Birthday {{1}}! Best wishes from the {{2}} family.'
  },
  ANNIVERSARY_GREETING: {
    name: 'anniversary_greeting',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Happy Workversary/Anniversary {{1}}! Keep crushing it at {{2}}.'
  },
  KYC_VERIFIED: {
    name: 'kyc_verified',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name'],
    body: 'Hi {{1}}, your KYC documents have been successfully verified.'
  },
  KYC_REJECTED: {
    name: 'kyc_rejected',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'reason'],
    body: 'Hi {{1}}, your KYC was rejected. Reason: {{2}}. Please resubmit.'
  },
  DIET_CHART_SENT: {
    name: 'diet_chart_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Hi {{1}}, your new diet chart from {{2}} is attached.'
  },
  EXERCISE_PLAN_SENT: {
    name: 'exercise_plan_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'gym_name'],
    body: 'Hi {{1}}, your new exercise plan from {{2}} is ready.'
  },
  INVOICE_SENT: {
    name: 'invoice_sent',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'invoice_id'],
    body: 'Hi {{1}}, please find attached your invoice {{2}}.'
  },
  REVIEW_REQUEST: {
    name: 'review_request',
    category: 'MARKETING',
    language: 'en',
    variables: ['member_name', 'gym_name', 'link'],
    body: 'Hi {{1}}, how is your experience at {{2}}? Leave us a review: {{3}}'
  },
  PROMO_BROADCAST: {
    name: 'promo_broadcast',
    category: 'MARKETING',
    language: 'en',
    variables: ['promo_details', 'validity'],
    body: 'Special Offer: {{1}}. Valid until {{2}}.'
  },
  GENERAL_UPDATE: {
    name: 'general_update',
    category: 'UTILITY',
    language: 'en',
    variables: ['member_name', 'update_message'],
    body: 'Hi {{1}}, important update: {{2}}'
  }
};
