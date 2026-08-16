import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/utils/permissions';
import { Permission, UserRole } from '@/types/auth';

describe('RBAC Permission Helpers', () => {
  it('should grant owner access to all permissions unconditionally', () => {
    const isGranted = hasPermission('owner', [], 'members.delete');
    expect(isGranted).toBe(true);
  });

  it('should verify receptionist default permissions', () => {
    // Receptionist has member.add
    expect(hasPermission('receptionist', [], 'members.add')).toBe(true);
    // Receptionist does NOT have member.delete
    expect(hasPermission('receptionist', [], 'members.delete')).toBe(false);
  });

  it('should check custom assigned permissions', () => {
    // Trainer does not have settings.manage by default
    expect(hasPermission('trainer', [], 'settings.manage')).toBe(false);
    
    // Granting settings.manage via custom array
    expect(hasPermission('trainer', ['settings.manage'], 'settings.manage')).toBe(true);
  });

  it('should check hasAnyPermission helper', () => {
    const permissions: Permission[] = ['members.add'];
    const matched = hasAnyPermission('receptionist', permissions, ['members.delete', 'members.add']);
    expect(matched).toBe(true);

    const noneMatched = hasAnyPermission('trainer', [], ['settings.manage', 'invoices.create']);
    expect(noneMatched).toBe(false);
  });

  it('should check hasAllPermissions helper', () => {
    const matched = hasAllPermissions('receptionist', [], ['members.add', 'invoices.create']);
    expect(matched).toBe(true);

    const notMatched = hasAllPermissions('receptionist', [], ['members.add', 'members.delete']);
    expect(notMatched).toBe(false);
  });
});
