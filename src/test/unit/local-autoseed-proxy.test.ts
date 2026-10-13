/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  isAutoSeedEnabled,
  DEMO_GYM_DEFAULTS,
  checkAndAutoSeedDemoGym,
} from '@/lib/server/auto-seed';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GET as getSetupStatus } from '@/app/api/setup/status/route';
import { POST as postSetupInit } from '@/app/api/setup/init/route';

describe('Local Reverse Proxy & Automatic TLS Configuration (deploy/Caddyfile)', () => {
  const caddyfilePath = path.resolve(process.cwd(), 'deploy/Caddyfile');

  it('exists and has global options for local offline appliance', () => {
    expect(fs.existsSync(caddyfilePath)).toBe(true);
    const content = fs.readFileSync(caddyfilePath, 'utf8');
    expect(content).toContain('admin off');
    expect(content).toContain('auto_https disable_redirects');
  });

  it('defines plain HTTP reverse proxy on port 80', () => {
    const content = fs.readFileSync(caddyfilePath, 'utf8');
    expect(content).toContain('http://:80');
    expect(content).toContain('reverse_proxy app:3000');
    expect(content).toContain('header_up X-Forwarded-Proto http');
  });

  it('defines local HTTPS reverse proxy on port 443 with internal TLS', () => {
    const content = fs.readFileSync(caddyfilePath, 'utf8');
    expect(content).toContain('tls internal');
    expect(content).toContain(':443');
    expect(content).toContain('reverse_proxy app:3000');
    expect(content).toContain('header_up X-Forwarded-Proto https');
  });

  it('contains zero unicode em-dashes or en-dashes', () => {
    const content = fs.readFileSync(caddyfilePath, 'utf8');
    expect(content).not.toMatch(/[\u2014\u2013]/);
  });
});

describe('Docker Compose Caddy & Auto-Seed Integration', () => {
  const offlinePath = path.resolve(process.cwd(), 'docker-compose.offline.yml');
  const standardPath = path.resolve(process.cwd(), 'docker-compose.yml');

  it('configures caddy service in docker-compose.offline.yml with proxy profile', () => {
    const content = fs.readFileSync(offlinePath, 'utf8');
    expect(content).toContain('container_name: gymerp-proxy');
    expect(content).toContain('image: caddy:2-alpine');
    expect(content).toContain('"80:80"');
    expect(content).toContain('"443:443"');
    expect(content).toContain('./deploy/Caddyfile:/etc/caddy/Caddyfile:ro');
    expect(content).toContain('profiles:');
    expect(content).toContain('- proxy');
    expect(content).toContain('- full');
  });

  it('configures caddy service in standard docker-compose.yml with persistent volumes', () => {
    const content = fs.readFileSync(standardPath, 'utf8');
    expect(content).toContain('container_name: gymerp-proxy');
    expect(content).toContain('caddy_data:');
    expect(content).toContain('caddy_config:');
  });

  it('configures AUTO_SEED_DEMO_GYM environment flag in both compose files', () => {
    const offlineContent = fs.readFileSync(offlinePath, 'utf8');
    expect(offlineContent).toContain('AUTO_SEED_DEMO_GYM: ${AUTO_SEED_DEMO_GYM:-false}');

    const standardContent = fs.readFileSync(standardPath, 'utf8');
    expect(standardContent).toContain('AUTO_SEED_DEMO_GYM: ${AUTO_SEED_DEMO_GYM:-false}');
  });
});

describe('Cold-Boot Auto-Seed Engine (src/lib/server/auto-seed.ts)', () => {
  const originalEnv = process.env.AUTO_SEED_DEMO_GYM;

  afterEach(() => {
    process.env.AUTO_SEED_DEMO_GYM = originalEnv;
    vi.restoreAllMocks();
  });

  it('isAutoSeedEnabled accurately parses truthy environment values', () => {
    process.env.AUTO_SEED_DEMO_GYM = 'true';
    expect(isAutoSeedEnabled()).toBe(true);

    process.env.AUTO_SEED_DEMO_GYM = '1';
    expect(isAutoSeedEnabled()).toBe(true);

    process.env.AUTO_SEED_DEMO_GYM = 'yes';
    expect(isAutoSeedEnabled()).toBe(true);

    process.env.AUTO_SEED_DEMO_GYM = 'false';
    expect(isAutoSeedEnabled()).toBe(false);

    delete process.env.AUTO_SEED_DEMO_GYM;
    expect(isAutoSeedEnabled()).toBe(false);
  });

  it('exports valid demo gym defaults', () => {
    expect(DEMO_GYM_DEFAULTS.gymName).toBe('Iron Forge Fitness Club');
    expect(DEMO_GYM_DEFAULTS.email).toBe('admin@gymerp.local');
    expect(DEMO_GYM_DEFAULTS.password).toBe('admin123');
    expect(DEMO_GYM_DEFAULTS.branchName).toBe('Iron Forge Downtown');
    expect(DEMO_GYM_DEFAULTS.kioskDeviceToken).toBe('kiosk-demo-terminal-local');
    expect(DEMO_GYM_DEFAULTS.kioskPairingCode).toBe('123456');
  });

  it('aborts auto-seeding if gym count is greater than 0 without force flag', async () => {
    process.env.AUTO_SEED_DEMO_GYM = 'true';

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      if (table === 'gyms') {
        return {
          select: vi.fn().mockResolvedValue({ count: 1, error: null }),
        };
      }
      return {};
    }) as any);

    const result = await checkAndAutoSeedDemoGym({ force: false });
    expect(result.seeded).toBe(false);
    expect(result.message).toContain('already initialized');
  });

  it('aborts auto-seeding if AUTO_SEED_DEMO_GYM is disabled and force is false', async () => {
    process.env.AUTO_SEED_DEMO_GYM = 'false';

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      if (table === 'gyms') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      return {};
    }) as any);

    const result = await checkAndAutoSeedDemoGym({ force: false });
    expect(result.seeded).toBe(false);
    expect(result.message).toContain('not enabled');
  });

  it('provisions complete gym, branch, routines, and kiosk terminal when cold-booting', async () => {
    process.env.AUTO_SEED_DEMO_GYM = 'true';

    const insertedTables: Record<string, any[]> = {};
    const mockGymId = '00000000-0000-0000-0000-000000000001';
    const mockBranchId = '00000000-0000-0000-0000-000000000002';

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      if (!insertedTables[table]) insertedTables[table] = [];

      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: DEMO_GYM_DEFAULTS.gymName }, error: null });
            if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: DEMO_GYM_DEFAULTS.branchName }, error: null });
            return Promise.resolve({ data: null, error: null });
          }),
        }),
        insert: vi.fn().mockImplementation((payload: any) => {
          insertedTables[table].push(payload);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: DEMO_GYM_DEFAULTS.gymName }, error: null });
                if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: DEMO_GYM_DEFAULTS.branchName }, error: null });
                return Promise.resolve({ data: payload, error: null });
              }),
            }),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }) as any);

    // Mock count query for gyms
    (supabaseAdmin.from('gyms') as any).select = vi.fn().mockImplementation((_cols: string, opts?: any) => {
      if (opts?.count === 'exact') {
        return Promise.resolve({ count: 0, error: null });
      }
      return {
        single: vi.fn().mockResolvedValue({ data: { id: mockGymId }, error: null }),
      };
    });

    const result = await checkAndAutoSeedDemoGym({ force: false });

    expect(result.seeded).toBe(true);
    expect(result.gymId).toBe(mockGymId);
    expect(result.branchId).toBe(mockBranchId);
    expect(result.email).toBe(DEMO_GYM_DEFAULTS.email);
    expect(result.kioskToken).toBe(DEMO_GYM_DEFAULTS.kioskDeviceToken);
    expect(result.pairingCode).toBe(DEMO_GYM_DEFAULTS.kioskPairingCode);
    expect(result.routinesCount).toBeGreaterThanOrEqual(2);
    expect(result.token).toBeDefined();

    // Verify inserted data in mock tables
    expect(insertedTables['branches']).toBeDefined();
    expect(insertedTables['branches'][0].name).toBe(DEMO_GYM_DEFAULTS.branchName);

    expect(insertedTables['users']).toBeDefined();
    expect(insertedTables['users'][0].branch_id).toBe(mockBranchId);
    expect(insertedTables['users'][0].role).toBe('owner');

    expect(insertedTables['workout_routines']).toBeDefined();
    expect(insertedTables['workout_routines'][0].length).toBeGreaterThanOrEqual(2);

    expect(insertedTables['kiosk_devices']).toBeDefined();
    expect(insertedTables['kiosk_devices'][0].device_token).toBe(DEMO_GYM_DEFAULTS.kioskDeviceToken);
    expect(insertedTables['kiosk_devices'][0].status).toBe('active');
  });
});

describe('Setup API Endpoints Hardening', () => {
  const originalEnv = process.env.AUTO_SEED_DEMO_GYM;

  afterEach(() => {
    process.env.AUTO_SEED_DEMO_GYM = originalEnv;
    vi.restoreAllMocks();
  });

  it('GET /api/setup/status reports uninitialized when 0 gyms and auto-seed disabled', async () => {
    process.env.AUTO_SEED_DEMO_GYM = 'false';

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      if (table === 'gyms') {
        return {
          select: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      return {};
    }) as any);

    const res = await getSetupStatus();
    const data = await res.json();
    expect(data.initialized).toBe(false);
    expect(data.gymCount).toBe(0);
  });

  it('GET /api/setup/status triggers auto-seed when 0 gyms and auto-seed is enabled', async () => {
    process.env.AUTO_SEED_DEMO_GYM = 'true';

    const mockGymId = '00000000-0000-0000-0000-000000000001';
    const mockBranchId = '00000000-0000-0000-0000-000000000002';

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      return {
        select: vi.fn().mockImplementation((_cols?: string, opts?: any) => {
          if (opts?.count === 'exact') {
            return Promise.resolve({ count: 0, error: null });
          }
          return {
            single: vi.fn().mockImplementation(() => {
              if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: DEMO_GYM_DEFAULTS.gymName }, error: null });
              if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: DEMO_GYM_DEFAULTS.branchName }, error: null });
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => {
              if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: DEMO_GYM_DEFAULTS.gymName }, error: null });
              if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: DEMO_GYM_DEFAULTS.branchName }, error: null });
              return Promise.resolve({ data: {}, error: null });
            }),
          }),
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }) as any);

    const res = await getSetupStatus();
    const data = await res.json();
    expect(data.initialized).toBe(true);
    expect(data.autoSeeded).toBe(true);
    expect(data.gymCount).toBe(1);
    expect(data.gymId).toBe(mockGymId);
    expect(data.branchId).toBe(mockBranchId);
  });

  it('POST /api/setup/init provisions primary branch, workout routines, and kiosk device', async () => {
    const mockGymId = '11111111-1111-1111-1111-111111111111';
    const mockBranchId = '22222222-2222-2222-2222-222222222222';
    const insertedTables: Record<string, any[]> = {};

    vi.spyOn(supabaseAdmin, 'from').mockImplementation(((table: string) => {
      if (!insertedTables[table]) insertedTables[table] = [];

      return {
        select: vi.fn().mockImplementation((_cols?: string, opts?: any) => {
          if (opts?.count === 'exact') {
            return Promise.resolve({ count: 0, error: null });
          }
          return {
            single: vi.fn().mockImplementation(() => {
              if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: 'Titanium Fitness' }, error: null });
              if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: 'Titanium Fitness Main Branch' }, error: null });
              return Promise.resolve({ data: null, error: null });
            }),
          };
        }),
        insert: vi.fn().mockImplementation((payload: any) => {
          insertedTables[table].push(payload);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                if (table === 'gyms') return Promise.resolve({ data: { id: mockGymId, name: 'Titanium Fitness' }, error: null });
                if (table === 'branches') return Promise.resolve({ data: { id: mockBranchId, name: 'Titanium Fitness Main Branch' }, error: null });
                if (table === 'kiosk_devices') return Promise.resolve({ data: { device_token: 'kiosk-token-test-123' }, error: null });
                return Promise.resolve({ data: payload, error: null });
              }),
            }),
            eq: vi.fn().mockResolvedValue({ error: null }),
          };
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }) as any);

    const req = new Request('http://localhost:3000/api/setup/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gym: {
          name: 'Titanium Fitness',
          phone: '+91 99999 88888',
          city: 'Delhi',
          state: 'Delhi',
        },
        owner: {
          name: 'Rajesh Sharma',
          email: 'rajesh@titanium.local',
          password: 'password123',
        },
      }),
    });

    const res = await postSetupInit(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.gymId).toBe(mockGymId);
    expect(data.branchId).toBe(mockBranchId);
    expect(data.kioskToken).toBeDefined();
    expect(data.pairingCode).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user.branchId).toBe(mockBranchId);

    // Verify branch was created
    expect(insertedTables['branches']).toBeDefined();
    expect(insertedTables['branches'][0].name).toBe('Titanium Fitness Main Branch');

    // Verify workout routines were seeded
    expect(insertedTables['workout_routines']).toBeDefined();
    expect(insertedTables['workout_routines'][0].length).toBeGreaterThanOrEqual(2);

    // Verify kiosk device was provisioned
    expect(insertedTables['kiosk_devices']).toBeDefined();
    expect(insertedTables['kiosk_devices'][0].status).toBe('active');
  });
});
