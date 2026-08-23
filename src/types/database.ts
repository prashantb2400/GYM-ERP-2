// TypeScript definitions for GymERP Database Schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface GymAddress {
  street?: string;
  city?: string;
  state?: string;
  pin?: string;
}

export interface WorkingHours {
  open: string;
  close: string;
}

export interface GymSettings {
  cctv_enabled: boolean;
  whatsapp_enabled: boolean;
  biometric_enabled: boolean;
  demo_seeded?: boolean;
}

export interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}

export interface LineItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface MealItem {
  name: string;
  qty: string;
  calories: number;
  protein: number;
}

export interface Meal {
  meal_name: string;
  time: string;
  items: MealItem[];
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface ExerciseDay {
  day: string;
  exercises: Exercise[];
}

export interface SubscriptionFeatures {
  cctv: boolean;
  wa_broadcast: boolean;
  analytics_export: boolean;
}

/**
 * public.gyms Table Row Type
 */
export interface Gym {
  id: string;
  name: string;
  owner_id: string | null;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_business: string | null;
  address: GymAddress;
  gstin: string | null;
  pan: string | null;
  logo_url: string | null;
  tagline: string | null;
  working_hours: WorkingHours;
  days_open: string[];
  subscription_tier: 'free' | 'pro' | 'enterprise';
  subscription_expires_at: string | null;
  is_setup_complete: boolean;
  settings: GymSettings;
  created_at: string;
  updated_at: string;
}

export type GymInsert = Omit<Gym, 'id' | 'created_at' | 'updated_at'>;
export type GymUpdate = Partial<GymInsert>;

/**
 * public.users Table Row Type
 */
export interface User {
  id: string;
  auth_id: string | null;
  gym_id: string | null;
  branch_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  login_id: string | null;
  role: 'owner' | 'receptionist' | 'trainer';
  permissions: string[];
  photo_url: string | null;
  specialization: string | null;
  bio: string | null;
  is_active: boolean;
  commission_rate_pct?: number;
  last_login: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UserUpdate = Partial<UserInsert>;

/**
 * public.plans Table Row Type
 */
export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  duration_days: number;
  price: number;
  features: string[];
  highlights: string[];
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type PlanInsert = Omit<Plan, 'id' | 'created_at' | 'updated_at'>;
export type PlanUpdate = Partial<PlanInsert>;

/**
 * public.diet_charts Table Row Type
 */
export interface DietChart {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  meals: Meal[];
  target_calories: number | null;
  is_template: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type DietChartInsert = Omit<DietChart, 'id' | 'created_at' | 'updated_at'>;
export type DietChartUpdate = Partial<DietChartInsert>;

/**
 * public.exercise_charts Table Row Type
 */
export interface ExerciseChart {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  days: ExerciseDay[];
  is_template: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type ExerciseChartInsert = Omit<ExerciseChart, 'id' | 'created_at' | 'updated_at'>;
export type ExerciseChartUpdate = Partial<ExerciseChartInsert>;

/**
 * public.members Table Row Type
 */
export interface Member {
  id: string;
  auth_id: string | null;
  gym_id: string;
  branch_id: string | null;
  member_code: string;
  name: string;
  phone: string;
  whatsapp_phone: string | null;
  email: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_group: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  photo_url: string | null;
  emergency_contact: EmergencyContact;
  current_plan_id: string | null;
  plan_start_date: string | null;
  plan_end_date: string | null;
  admission_date: string;
  status: 'active' | 'expired' | 'frozen' | 'cancelled' | 'pending';
  trainer_id: string | null;
  diet_chart_id: string | null;
  exercise_chart_id: string | null;
  bmi: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  health_goals: string[];
  fitness_level: 'beginner' | 'intermediate' | 'advanced' | null;
  medical_conditions: string | null;
  timing_slot: string | null;
  has_locker: boolean;
  locker_number: string | null;
  total_due: number;
  total_paid_lifetime: number;
  last_attendance: string | null;
  attendance_count: number;
  face_enrolled: boolean;
  biometric_enrolled: boolean;
  kyc_status: 'pending' | 'verified' | 'rejected';
  birthday_notified_year: number | null;
  anniversary_notified_year: number | null;
  review_request_sent: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export type MemberInsert = Omit<Member, 'id' | 'created_at' | 'updated_at'>;
export type MemberUpdate = Partial<MemberInsert>;

/**
 * public.invoices Table Row Type
 */
export interface Invoice {
  id: string;
  gym_id: string;
  invoice_number: string;
  member_id: string;
  member_name: string;
  line_items: LineItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'online' | null;
  transaction_id: string | null;
  trainer_id?: string | null;
  trainer_commission_amount?: number;
  status: 'paid' | 'partial' | 'pending';
  issued_at: string;
  paid_at: string | null;
  sent_via_whatsapp: boolean;
  pdf_url: string | null;
  created_by: string | null;
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'issued_at'>;
export type InvoiceUpdate = Partial<InvoiceInsert>;

/**
 * public.attendance Table Row Type
 */
export interface Attendance {
  id: string;
  gym_id: string;
  member_id: string;
  member_name: string;
  date: string;
  check_in_time: string;
  method: 'manual' | 'face_recognition' | 'fingerprint';
  device_id: string | null;
  device_name: string | null;
  confidence: number | null;
  snapshot_url: string | null;
  marked_by: string | null;
  notes: string | null;
}

export type AttendanceInsert = Omit<Attendance, 'id' | 'check_in_time'>;
export type AttendanceUpdate = Partial<AttendanceInsert>;

/**
 * public.followups Table Row Type
 */
export interface Followup {
  id: string;
  gym_id: string;
  member_id: string;
  member_name: string;
  type: 'inactive' | 'renewal' | 'due' | 'general' | 'new_lead';
  scheduled_date: string;
  notes: string | null;
  status: 'open' | 'completed' | 'missed' | 'cancelled';
  completed_at: string | null;
  completed_by: string | null;
  outcome: string | null;
  created_at: string;
  created_by: string | null;
}

export type FollowupInsert = Omit<Followup, 'id' | 'created_at'>;
export type FollowupUpdate = Partial<FollowupInsert>;

/**
 * public.due_records Table Row Type
 */
export interface DueRecord {
  id: string;
  gym_id: string;
  member_id: string;
  invoice_id: string | null;
  amount: number;
  collected_amount: number;
  payment_mode: string | null;
  status: 'pending' | 'partial' | 'collected';
  due_date: string | null;
  collected_at: string | null;
  collected_by: string | null;
  notes: string | null;
  created_at: string;
}

export type DueRecordInsert = Omit<DueRecord, 'id' | 'created_at'>;
export type DueRecordUpdate = Partial<DueRecordInsert>;

/**
 * public.kyc_documents Table Row Type
 */
export interface KycDocument {
  id: string;
  gym_id: string;
  member_id: string;
  document_type: 'aadhaar' | 'pan' | 'driving_license' | 'passport' | 'other';
  document_url: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  uploaded_at: string;
}

export type KycDocumentInsert = Omit<KycDocument, 'id' | 'uploaded_at'>;
export type KycDocumentUpdate = Partial<KycDocumentInsert>;

/**
 * public.whatsapp_logs Table Row Type
 */
export interface WhatsappLog {
  id: string;
  gym_id: string;
  member_id: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  message_type: 'text' | 'template' | 'document';
  template_name: string | null;
  document_type: string | null;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  wa_message_id: string | null;
  error_message: string | null;
  sent_at: string;
}

export type WhatsappLogInsert = Omit<WhatsappLog, 'id' | 'sent_at'>;
export type WhatsappLogUpdate = Partial<WhatsappLogInsert>;

/**
 * public.cron_logs Table Row Type
 */
export interface CronLog {
  id: string;
  gym_id: string | null;
  job_name: string;
  members_notified: number;
  channel: string | null;
  status: 'success' | 'failed' | 'partial' | null;
  duration_ms: number | null;
  error: string | null;
  run_at: string;
}

export type CronLogInsert = Omit<CronLog, 'id' | 'run_at'>;

/**
 * public.counters Table Row Type
 */
export interface Counter {
  id: string;
  gym_id: string;
  member_count: number;
  invoice_count: number;
}

/**
 * public.subscriptions Table Row Type
 */
export interface Subscription {
  id: string;
  gym_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  max_members: number;
  features: SubscriptionFeatures;
  started_at: string;
  expires_at: string | null;
  payment_id: string | null;
  is_active: boolean;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'started_at'>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

/**
 * public.branches Table Row Type
 */
export interface Branch {
  id: string;
  gym_id: string;
  name: string;
  phone: string | null;
  address: GymAddress;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BranchInsert = Omit<Branch, 'id' | 'created_at' | 'updated_at'>;
export type BranchUpdate = Partial<BranchInsert>;

/**
 * public.expenses Table Row Type
 */
export interface Expense {
  id: string;
  gym_id: string;
  branch_id: string | null;
  title: string;
  category: string;
  amount: number;
  date: string;
  payment_mode: 'cash' | 'upi' | 'card' | 'bank_transfer' | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at'>;
export type ExpenseUpdate = Partial<ExpenseInsert>;

/**
 * public.inventory Table Row Type
 */
export interface Inventory {
  id: string;
  gym_id: string;
  branch_id: string | null;
  name: string;
  sku: string | null;
  category: string | null;
  stock_quantity: number;
  reorder_level: number;
  purchase_price: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
}

export type InventoryInsert = Omit<Inventory, 'id' | 'created_at' | 'updated_at'>;
export type InventoryUpdate = Partial<InventoryInsert>;

/**
 * public.inventory_transactions Table Row Type
 */
export interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  unit_price: number | null;
  invoice_id: string | null;
  created_at: string;
  created_by: string | null;
}

export type InventoryTransactionInsert = Omit<InventoryTransaction, 'id' | 'created_at'>;

/**
 * public.payment_transactions Table Row Type
 */
export interface PaymentTransaction {
  id: string;
  gym_id: string;
  member_id: string;
  invoice_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  error_code: string | null;
  error_description: string | null;
  created_at: string;
}

export type PaymentTransactionInsert = Omit<PaymentTransaction, 'id' | 'created_at'>;

