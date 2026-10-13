/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { signLocalToken, verifyLocalToken } from '@/lib/server/local-auth';

describe('USB Auto-Backup Daemon (deploy/usb-backup.sh)', () => {
  const scriptPath = path.resolve(process.cwd(), 'deploy/usb-backup.sh');

  it('exists and has bash executable header', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
    expect(content).toContain('set -e');
  });

  it('scans standard Linux removable mount paths for USB storage', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('/media/*/*');
    expect(content).toContain('/mnt/*');
    expect(content).toContain('/run/media/*/*');
  });

  it('creates GymERP-Backups directory and outputs gzip compressed SQL', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('GymERP-Backups');
    expect(content).toContain('gymerp-backup-');
    expect(content).toContain('.sql.gz');
    expect(content).toContain('gzip > "$BACKUP_FILE"');
  });

  it('supports both containerized gymerp-db and host pg_dump', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('docker exec gymerp-db pg_dump -U postgres gymerp');
    expect(content).toContain('pg_dump -U');
  });

  it('enforces a 14-day backup retention policy to prevent flash drive saturation', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('tail -n +15');
    expect(content).toContain('rm --');
  });

  it('calls sync to ensure data is flushed before drive removal', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('sync');
  });

  it('contains zero unicode em-dashes or en-dashes', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).not.toMatch(/[\u2014\u2013]/);
  });
});

describe('Appliance USB Backup Udev & Systemd Units', () => {
  const rulesPath = path.resolve(process.cwd(), 'deploy/99-gymerp-usb-backup.rules');
  const servicePath = path.resolve(process.cwd(), 'deploy/gymerp-usb-backup.service');
  const timerPath = path.resolve(process.cwd(), 'deploy/gymerp-usb-backup.timer');

  it('defines udev block device rule triggering systemd service on flash drive insertion', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf8');
    expect(content).toContain('ACTION=="add"');
    expect(content).toContain('SUBSYSTEM=="block"');
    expect(content).toContain('KERNEL=="sd[a-z][0-9]"');
    expect(content).toContain('ENV{SYSTEMD_WANTS}="gymerp-usb-backup.service"');
  });

  it('defines oneshot systemd backup service executing usb-backup.sh', () => {
    expect(fs.existsSync(servicePath)).toBe(true);
    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toContain('Type=oneshot');
    expect(content).toContain('/opt/gymerp/deploy/usb-backup.sh');
    expect(content).toContain('After=docker.service postgresql.service');
  });

  it('defines persistent systemd timer for periodic backup synchronization', () => {
    expect(fs.existsSync(timerPath)).toBe(true);
    const content = fs.readFileSync(timerPath, 'utf8');
    expect(content).toContain('OnUnitActiveSec=1h');
    expect(content).toContain('Persistent=true');
  });
});

describe('Cross-Platform Appliance Launchers (start-gymerp.sh & start-gymerp.bat)', () => {
  const shPath = path.resolve(process.cwd(), 'start-gymerp.sh');
  const batPath = path.resolve(process.cwd(), 'start-gymerp.bat');

  it('start-gymerp.sh initiates docker compose with proxy profile and fallback', () => {
    expect(fs.existsSync(shPath)).toBe(true);
    const content = fs.readFileSync(shPath, 'utf8');
    expect(content).toContain('docker compose -f docker-compose.offline.yml --profile proxy up -d');
    expect(content).toContain('http://${LOCAL_IP}:3000');
    expect(content).toContain('https://gymerp.local');
  });

  it('start-gymerp.bat initiates docker compose with proxy profile and displays local HTTPS', () => {
    expect(fs.existsSync(batPath)).toBe(true);
    const content = fs.readFileSync(batPath, 'utf8');
    expect(content).toContain('docker compose -f docker-compose.offline.yml --profile proxy up -d');
    expect(content).toContain('https://gymerp.local');
    expect(content).toContain('http://localhost:3000/setup');
  });

  it('both launchers configure default offline secrets if .env.local is missing', () => {
    const shContent = fs.readFileSync(shPath, 'utf8');
    const batContent = fs.readFileSync(batPath, 'utf8');

    expect(shContent).toContain('PGRST_JWT_SECRET=gymerp-offline-local-jwt-secret-minimum-32-chars-long');
    expect(batContent).toContain('PGRST_JWT_SECRET=gymerp-offline-local-jwt-secret-minimum-32-chars-long');
    expect(shContent).toContain('INTERNAL_POSTGREST_URL=http://localhost:54321');
    expect(batContent).toContain('INTERNAL_POSTGREST_URL=http://localhost:54321');
  });
});

describe('Raspberry Pi & Linux Appliance Automated Installer (deploy/install-pi.sh)', () => {
  const installPath = path.resolve(process.cwd(), 'deploy/install-pi.sh');

  it('enforces root or sudo privilege check', () => {
    expect(fs.existsSync(installPath)).toBe(true);
    const content = fs.readFileSync(installPath, 'utf8');
    expect(content).toContain('[ "$EUID" -ne 0 ]');
  });

  it('configures PostgreSQL with gymerp database', () => {
    const content = fs.readFileSync(installPath, 'utf8');
    expect(content).toContain('CREATE DATABASE gymerp;');
    expect(content).toContain('deploy/init-db.sh');
  });

  it('downloads correct architecture binary for PostgREST (ARM64 vs x64)', () => {
    const content = fs.readFileSync(installPath, 'utf8');
    expect(content).toContain('ARCH=$(uname -m)');
    expect(content).toContain('postgrest-${PGRST_VER}-linux-static-aarch64.tar.xz');
    expect(content).toContain('postgrest-${PGRST_VER}-linux-static-x64.tar.xz');
  });

  it('installs Avahi mDNS service and USB backup automation units', () => {
    const content = fs.readFileSync(installPath, 'utf8');
    expect(content).toContain('deploy/avahi-gymerp.service');
    expect(content).toContain('deploy/gymerp-usb-backup.service');
    expect(content).toContain('deploy/gymerp-usb-backup.timer');
    expect(content).toContain('deploy/99-gymerp-usb-backup.rules');
  });
});

describe('End-to-End Appliance Token Claims & PostgREST Contract', () => {
  it('generates JWT matching PostgREST schema and role expectations', async () => {
    const mockUser = {
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'counter@localgym.in',
      gym_id: 'b0000000-0000-0000-0000-000000000002',
      role: 'owner',
      name: 'Counter Admin',
    };

    const token = await signLocalToken(mockUser);
    expect(typeof token).toBe('string');

    const verified = await verifyLocalToken(token);
    expect(verified).not.toBeNull();

    // Verify PostgREST claims
    expect(verified?.sub).toBe(mockUser.id);
    expect(verified?.aud).toBe('authenticated');
    expect(verified?.role).toBe('authenticated');
    expect(verified?.app_role).toBe('owner');
    expect(verified?.gym_id).toBe(mockUser.gym_id);
    expect(verified?.email).toBe(mockUser.email);
  });
});
