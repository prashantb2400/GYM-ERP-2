#!/usr/bin/env bash
set -e

echo "==> Initializing GymERP Offline Database..."

# 1. Setup Auth Schema & Supabase compatibility functions
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  -- Create PostgREST & Auth roles if not existing
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN;
    END IF;
  END
  \$\$;

  -- Create compatibility schema for auth.uid()
  CREATE SCHEMA IF NOT EXISTS auth;

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  \$\$ LANGUAGE sql STABLE;

  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  \$\$ LANGUAGE sql STABLE;
EOSQL

# 2. Execute all schema migrations in numerical order
echo "==> Applying schema migrations from /migrations..."
for migration_file in $(ls /migrations/*.sql | sort -V); do
  echo "    --> Running $migration_file"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration_file" || {
    echo "Warning: Error executing $migration_file, continuing..."
  }
done

# 3. Grant schema permissions to PostgREST roles
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
EOSQL

echo "==> GymERP Offline Database initialization completed successfully!"
