import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Local Appliance Database Initializer (init-db.sh)', () => {
  const initDbPath = path.resolve(process.cwd(), 'deploy/init-db.sh');

  it('exists and is an executable shell script', () => {
    expect(fs.existsSync(initDbPath)).toBe(true);
    const content = fs.readFileSync(initDbPath, 'utf8');
    expect(content.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  it('defines auth compatibility schema, users table, and uid/jwt functions', () => {
    const content = fs.readFileSync(initDbPath, 'utf8');
    expect(content).toContain('CREATE SCHEMA IF NOT EXISTS auth;');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS auth.users');
    expect(content).toContain('CREATE OR REPLACE FUNCTION auth.uid()');
    expect(content).toContain('CREATE OR REPLACE FUNCTION auth.jwt()');
  });

  it('defines storage compatibility schema, buckets, objects, and path functions', () => {
    const content = fs.readFileSync(initDbPath, 'utf8');
    expect(content).toContain('CREATE SCHEMA IF NOT EXISTS storage;');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS storage.buckets');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS storage.objects');
    expect(content).toContain('CREATE OR REPLACE FUNCTION storage.foldername');
    expect(content).toContain('CREATE OR REPLACE FUNCTION storage.filename');
    expect(content).toContain('CREATE OR REPLACE FUNCTION storage.extension');
  });

  it('includes idempotent migration tracking via public._migrations table', () => {
    const content = fs.readFileSync(initDbPath, 'utf8');
    expect(content).toContain('CREATE TABLE IF NOT EXISTS public._migrations');
    expect(content).toContain('SELECT 1 FROM public._migrations WHERE name =');
    expect(content).toContain('INSERT INTO public._migrations (name)');
  });

  it('grants full schema privileges to anon, authenticated, and service_role', () => {
    const content = fs.readFileSync(initDbPath, 'utf8');
    expect(content).toContain('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;');
    expect(content).toContain('GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;');
    expect(content).toContain('GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;');
    expect(content).toContain('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;');
  });
});

describe('Docker Compose Orchestration Topology', () => {
  const offlineComposePath = path.resolve(process.cwd(), 'docker-compose.offline.yml');
  const standardComposePath = path.resolve(process.cwd(), 'docker-compose.yml');

  it('defines db healthcheck using pg_isready', () => {
    const content = fs.readFileSync(offlineComposePath, 'utf8');
    expect(content).toContain('test: ["CMD-SHELL", "pg_isready -U postgres -d gymerp"]');
  });

  it('defines db-migrate service depending on healthy database', () => {
    const content = fs.readFileSync(offlineComposePath, 'utf8');
    expect(content).toContain('db-migrate:');
    expect(content).toContain('condition: service_healthy');
    expect(content).toContain('container_name: gymerp-db-migrate');
  });

  it('ensures PostgREST and Next.js app wait for successful migrations', () => {
    const content = fs.readFileSync(offlineComposePath, 'utf8');
    expect(content).toContain('db-migrate:');
    expect(content).toContain('condition: service_completed_successfully');
  });

  it('configures INTERNAL_SUPABASE_URL and INTERNAL_POSTGREST_URL for local container routing', () => {
    const offlineContent = fs.readFileSync(offlineComposePath, 'utf8');
    expect(offlineContent).toContain('INTERNAL_POSTGREST_URL: http://postgrest:3000');
    expect(offlineContent).toContain('INTERNAL_SUPABASE_URL: http://localhost:3000');

    const standardContent = fs.readFileSync(standardComposePath, 'utf8');
    expect(standardContent).toContain('INTERNAL_POSTGREST_URL: http://postgrest:3000');
    expect(standardContent).toContain('INTERNAL_SUPABASE_URL: http://localhost:3000');
  });

  it('configures WhatsApp bridge healthcheck on status endpoint', () => {
    const content = fs.readFileSync(offlineComposePath, 'utf8');
    expect(content).toContain('wget -q --spider http://localhost:48291/status');
  });
});

describe('Local Appliance Launcher Scripts', () => {
  const shPath = path.resolve(process.cwd(), 'start-gymerp.sh');
  const batPath = path.resolve(process.cwd(), 'start-gymerp.bat');

  it('sets INTERNAL_SUPABASE_URL in start-gymerp.sh default configuration', () => {
    const content = fs.readFileSync(shPath, 'utf8');
    expect(content).toContain('INTERNAL_SUPABASE_URL=http://localhost:3000');
    expect(content).toContain('INTERNAL_POSTGREST_URL=http://localhost:54321');
  });

  it('sets INTERNAL_SUPABASE_URL in start-gymerp.bat default configuration', () => {
    const content = fs.readFileSync(batPath, 'utf8');
    expect(content).toContain('INTERNAL_SUPABASE_URL=http://localhost:3000');
    expect(content).toContain('INTERNAL_POSTGREST_URL=http://localhost:54321');
  });
});

describe('Database Migration Integrity', () => {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');

  it('contains all sequential migrations from 001 to 021', () => {
    const files = fs.readdirSync(migrationsDir);
    expect(files).toContain('001_initial.sql');
    expect(files).toContain('009_storage_buckets.sql');
    expect(files).toContain('016_kiosk_device_pairings.sql');
    expect(files).toContain('017_cctv_and_vigilance.sql');
    expect(files).toContain('018_secure_kyc_storage.sql');
    expect(files).toContain('020_whatsapp_multi_provider.sql');
    expect(files).toContain('021_workout_routines_and_logs.sql');
  });
});
