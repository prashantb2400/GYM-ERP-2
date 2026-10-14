export const APP_NAME = 'GymERP';
export const APP_DESCRIPTION = 'Enterprise Gym Management Platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

import { Permission } from '@/types/auth';

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  permission: Permission | null;
}

export interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

export const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: 'Front Desk',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', permission: null },
      { label: 'Attendance Cockpit', href: '/dashboard/attendance', icon: 'CalendarCheck', permission: 'attendance.view' },
      { label: 'Members Directory', href: '/dashboard/members', icon: 'Users', permission: 'members.view' },
      { label: 'KYC Verification', href: '/dashboard/kyc', icon: 'FileCheck', permission: 'kyc.view' },
      { label: 'CCTV Vigilance', href: '/dashboard/cctv', icon: 'Cctv', permission: null },
    ],
  },
  {
    title: 'Growth & CRM',
    items: [
      { label: 'Leads Pipeline', href: '/dashboard/leads', icon: 'Target', permission: 'leads.view' },
      { label: 'Follow-up Queue', href: '/dashboard/followups', icon: 'PhoneCall', permission: 'followups.view' },
      { label: 'WhatsApp Automation', href: '/dashboard/whatsapp', icon: 'MessageCircle', permission: 'whatsapp.send' },
      { label: 'Membership Plans', href: '/dashboard/plans', icon: 'CreditCard', permission: 'plans.view' },
    ],
  },
  {
    title: 'Finance & Retail',
    items: [
      { label: 'Invoices & Billing', href: '/dashboard/invoices', icon: 'Receipt', permission: 'invoices.view' },
      { label: 'Due Collections', href: '/dashboard/due', icon: 'IndianRupee', permission: 'due.view' },
      { label: 'Expenses Ledger', href: '/dashboard/expenses', icon: 'Wallet', permission: 'expenses.view' },
      { label: 'Store Inventory', href: '/dashboard/inventory', icon: 'Package', permission: 'inventory.view' },
    ],
  },
  {
    title: 'Fitness & Training',
    items: [
      { label: 'Workouts Hub', href: '/dashboard/workouts', icon: 'Flame', permission: 'exercise.view' },
      { label: 'Exercise Routines', href: '/dashboard/exercise', icon: 'Dumbbell', permission: 'exercise.view' },
      { label: 'Diet & Nutrition', href: '/dashboard/diet', icon: 'Apple', permission: 'diet.view' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Staff & Roles', href: '/dashboard/staff', icon: 'UserCog', permission: 'staff.view' },
      { label: 'Branch Management', href: '/dashboard/branches', icon: 'Building2', permission: 'branches.view' },
      { label: 'Business Analytics', href: '/dashboard/analytics', icon: 'BarChart3', permission: 'analytics.view' },
      { label: 'System Settings', href: '/dashboard/settings', icon: 'Settings', permission: 'settings.view' },
      { label: 'System Cron Jobs', href: '/dashboard/cron', icon: 'Clock', permission: 'settings.manage' },
    ],
  },
];

export const SIDEBAR_ITEMS: SidebarItem[] = SIDEBAR_GROUPS.flatMap((group) => group.items);

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
