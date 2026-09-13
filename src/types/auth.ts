// Auth & RBAC Types for GymERP

export type UserRole = 'owner' | 'receptionist' | 'trainer';
export type MemberRole = 'member';

export type Permission = 
  | 'members.view' | 'members.add' | 'members.edit' | 'members.delete'
  | 'plans.view' | 'plans.manage'
  | 'invoices.view' | 'invoices.create' | 'invoices.delete'
  | 'analytics.view' | 'analytics.export'
  | 'followups.view' | 'followups.manage'
  | 'leads.view' | 'leads.manage'
  | 'due.view' | 'due.collect'
  | 'whatsapp.send' | 'whatsapp.broadcast'
  | 'attendance.view' | 'attendance.mark' | 'attendance.export'
  | 'diet.view' | 'diet.manage'
  | 'exercise.view' | 'exercise.manage'
  | 'kyc.view' | 'kyc.verify'
  | 'staff.view' | 'staff.manage'
  | 'settings.view' | 'settings.manage'
  | 'expenses.view' | 'expenses.manage'
  | 'inventory.view' | 'inventory.manage'
  | 'branches.view' | 'branches.manage'
  | 'cron.view' | 'cron.manage';

export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'members.view', 'members.add', 'members.edit', 'members.delete',
    'plans.view', 'plans.manage',
    'invoices.view', 'invoices.create', 'invoices.delete',
    'analytics.view', 'analytics.export',
    'followups.view', 'followups.manage',
    'leads.view', 'leads.manage',
    'due.view', 'due.collect',
    'whatsapp.send', 'whatsapp.broadcast',
    'attendance.view', 'attendance.mark', 'attendance.export',
    'diet.view', 'diet.manage',
    'exercise.view', 'exercise.manage',
    'kyc.view', 'kyc.verify',
    'staff.view', 'staff.manage',
    'settings.view', 'settings.manage',
    'expenses.view', 'expenses.manage',
    'inventory.view', 'inventory.manage',
    'branches.view', 'branches.manage',
    'cron.view', 'cron.manage'
  ],
  receptionist: [
    'members.view', 'members.add', 'members.edit',
    'invoices.view', 'invoices.create',
    'attendance.view', 'attendance.mark',
    'followups.view', 'followups.manage',
    'leads.view', 'leads.manage',
    'due.view', 'due.collect',
    'whatsapp.send', 'kyc.view', 'plans.view',
    'expenses.view', 'expenses.manage',
    'inventory.view', 'inventory.manage'
  ],
  trainer: [
    'members.view',
    'attendance.view', 'attendance.mark',
    'diet.view', 'diet.manage',
    'exercise.view', 'exercise.manage',
  ],
};

export interface AuthUser {
  id: string;
  authId: string;
  gymId: string;
  branchId: string | null;
  name: string;
  email: string | null;
  role: UserRole;
  permissions: Permission[];
  photoUrl: string | null;
  isActive: boolean;
  staffRecordId?: string;
}

export interface AuthMember {
  id: string;
  authId: string;
  gymId: string;
  branchId: string | null;
  name: string;
  phone: string;
  memberCode: string;
  photoUrl: string | null;
}
