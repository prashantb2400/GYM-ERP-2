export const APP_NAME = 'GymERP';
export const APP_DESCRIPTION = 'Enterprise Gym Management Platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: null },
  { label: 'Members', href: '/dashboard/members', icon: 'Users', permission: 'members.view' as const },
  { label: 'Leads', href: '/dashboard/leads', icon: 'Target', permission: 'leads.view' as const },
  { label: 'Plans', href: '/dashboard/plans', icon: 'CreditCard', permission: 'plans.view' as const },
  { label: 'Staff', href: '/dashboard/staff', icon: 'UserCog', permission: 'staff.view' as const },
  { label: 'Branches', href: '/dashboard/branches', icon: 'Building2', permission: 'branches.view' as const },
  { label: 'Invoices', href: '/dashboard/invoices', icon: 'Receipt', permission: 'invoices.view' as const },
  { label: 'Attendance', href: '/dashboard/attendance', icon: 'CalendarCheck', permission: 'attendance.view' as const },
  { label: 'CCTV & Vigilance', href: '/dashboard/cctv', icon: 'Cctv', permission: null },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3', permission: 'analytics.view' as const },
  { label: 'Follow-ups', href: '/dashboard/followups', icon: 'PhoneCall', permission: 'followups.view' as const },
  { label: 'Due Collection', href: '/dashboard/due', icon: 'IndianRupee', permission: 'due.view' as const },
  { label: 'Expenses', href: '/dashboard/expenses', icon: 'Wallet', permission: 'expenses.view' as const },
  { label: 'Inventory', href: '/dashboard/inventory', icon: 'Package', permission: 'inventory.view' as const },
  { label: 'WhatsApp', href: '/dashboard/whatsapp', icon: 'MessageCircle', permission: 'whatsapp.send' as const },
  { label: 'Diet Charts', href: '/dashboard/diet', icon: 'Apple', permission: 'diet.view' as const },
  { label: 'Exercise Plans', href: '/dashboard/exercise', icon: 'Dumbbell', permission: 'exercise.view' as const },
  { label: 'KYC', href: '/dashboard/kyc', icon: 'FileCheck', permission: 'kyc.view' as const },
  { label: 'Cron Jobs', href: '/dashboard/cron', icon: 'Clock', permission: 'settings.manage' as const },
  { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', permission: 'settings.view' as const },
] as const;

export const MEMBER_SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/member/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Plan', href: '/member/plan', icon: 'CreditCard' },
  { label: 'Diet Chart', href: '/member/diet', icon: 'Apple' },
  { label: 'Exercise Plan', href: '/member/exercise', icon: 'Dumbbell' },
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
export const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const PAYMENT_MODES = ['cash', 'upi', 'card', 'bank_transfer', 'online'] as const;
export const KYC_DOC_TYPES = ['aadhaar', 'pan', 'driving_license', 'passport', 'other'] as const;
export const MEMBER_STATUSES = ['active', 'expired', 'frozen', 'cancelled', 'pending'] as const;
export const FOLLOWUP_TYPES = ['inactive', 'renewal', 'due', 'general', 'new_lead'] as const;
