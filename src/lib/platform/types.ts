export interface PlanFeatures {
  whatsapp_enabled: boolean;
  cctv_enabled: boolean;
  hardware_bridge_enabled: boolean;
  diet_exercise_builder: boolean;
  custom_invoice_branding: boolean;
  crm_followups: boolean;
  analytics_advanced: boolean;
  api_access: boolean;
  white_label: boolean;
  priority_support: boolean;
}

export interface PlanLimits {
  max_members: number;
  max_staff: number;
  max_whatsapp_messages_per_day: number;
  max_cctv_cameras: number;
  max_storage_gb: number;
}

export interface PlatformPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  currency: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  features: PlanFeatures;
  limits: PlanLimits;
  created_at: string;
  updated_at: string;
}

export interface PlatformSubscription {
  id: string;
  gym_id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'suspended' | 'trialing';
  billing_cycle: 'monthly' | 'annual';
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformInvoice {
  id: string;
  subscription_id: string | null;
  gym_id: string;
  plan_id: string | null;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface SuperAdmin {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'support';
  is_active: boolean;
  created_at: string;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature';
  target_plans: string[];
  is_active: boolean;
  published_at: string;
  created_at: string;
}
