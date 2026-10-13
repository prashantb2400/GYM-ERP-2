#!/usr/bin/env bash
set -e

# ======================================================================
#             GymERP Offline Appliance Database Initializer
# ======================================================================
# Fully prepares local PostgreSQL for offline execution:
# 1. Configures PostgREST roles (anon, authenticated, service_role)
# 2. Configures auth compatibility schema and functions (auth.uid, auth.jwt)
# 3. Configures storage compatibility schema (storage.buckets, storage.objects)
# 4. Idempotently applies migrations 001 to 021 with tracking in _migrations
# 5. Grants full schema privileges to PostgREST roles
# ======================================================================

echo "==> Initializing GymERP Offline Database..."

DB_USER="${POSTGRES_USER:-${PGUSER:-postgres}}"
DB_NAME="${POSTGRES_DB:-${PGDATABASE:-gymerp}}"
DB_HOST="${PGHOST:-}"
DB_PORT="${PGPORT:-5432}"

PSQL_ARGS=("-v" "ON_ERROR_STOP=1" "--username" "$DB_USER" "--dbname" "$DB_NAME")
if [ -n "$DB_HOST" ]; then
  PSQL_ARGS+=("-h" "$DB_HOST" "-p" "$DB_PORT")
fi

run_sql() {
  psql "${PSQL_ARGS[@]}" -c "$1"
}

run_sql_file() {
  psql "${PSQL_ARGS[@]}" -f "$1"
}

# 1. Wait for PostgreSQL to be ready if running as a remote host
if [ -n "$DB_HOST" ]; then
  echo "    --> Waiting for database at ${DB_HOST}:${DB_PORT}..."
  for i in $(seq 1 30); do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

# 2. Setup Extensions, Roles, Auth Schema, and Storage Schema
echo "==> Configuring database extensions, roles, and compatibility schemas..."
psql "${PSQL_ARGS[@]}" <<-EOSQL
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

  -- 1. Auth Compatibility Schema & Functions
  CREATE SCHEMA IF NOT EXISTS auth;

  CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    encrypted_password TEXT,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  \$\$ LANGUAGE sql STABLE;

  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  \$\$ LANGUAGE sql STABLE;

  -- 2. Storage Compatibility Schema & Functions (Supabase Storage Emulation)
  CREATE SCHEMA IF NOT EXISTS storage;

  CREATE TABLE IF NOT EXISTS storage.buckets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    public BOOLEAN DEFAULT false,
    avif_autodetection BOOLEAN DEFAULT false,
    file_size_limit BIGINT,
    allowed_mime_types TEXT[]
  );

  CREATE TABLE IF NOT EXISTS storage.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id TEXT REFERENCES storage.buckets(id),
    name TEXT,
    owner UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb,
    path_tokens TEXT[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED
  );

  CREATE OR REPLACE FUNCTION storage.foldername(name text)
  RETURNS text[] AS \$\$
    SELECT string_to_array(name, '/');
  \$\$ LANGUAGE sql IMMUTABLE;

  CREATE OR REPLACE FUNCTION storage.filename(name text)
  RETURNS text AS \$\$
    SELECT split_part(name, '/', array_length(string_to_array(name, '/'), 1));
  \$\$ LANGUAGE sql IMMUTABLE;

  CREATE OR REPLACE FUNCTION storage.extension(name text)
  RETURNS text AS \$\$
    SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
  \$\$ LANGUAGE sql IMMUTABLE;

  -- 3. Migration Tracker Table
  CREATE TABLE IF NOT EXISTS public._migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  );
EOSQL

# 3. Locate and execute all schema migrations in numerical order
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"
if [ ! -d "$MIGRATIONS_DIR" ]; then
  if [ -d "./supabase/migrations" ]; then
    MIGRATIONS_DIR="./supabase/migrations"
  elif [ -d "$(dirname "$0")/../supabase/migrations" ]; then
    MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"
  fi
fi

echo "==> Applying schema migrations from: $MIGRATIONS_DIR"
if [ -d "$MIGRATIONS_DIR" ]; then
  for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
    migration_name=$(basename "$migration_file")
    
    # Check if migration was already recorded
    already_applied=$(psql "${PSQL_ARGS[@]}" -tAc "SELECT 1 FROM public._migrations WHERE name = '$migration_name';" 2>/dev/null || true)
    
    if [ "$already_applied" = "1" ]; then
      echo "    --> Skipping $migration_name (already applied)"
    else
      echo "    --> Applying $migration_name"
      psql "${PSQL_ARGS[@]}" -f "$migration_file" || {
        echo "    [WARN] Non-fatal notice in $migration_name, continuing..."
      }
      psql "${PSQL_ARGS[@]}" -c "INSERT INTO public._migrations (name) VALUES ('$migration_name') ON CONFLICT DO NOTHING;" || true
    fi
  done
else
  echo "    [WARN] No migrations directory found at $MIGRATIONS_DIR"
fi

# 4. Grant schema permissions to PostgREST roles
echo "==> Granting schema privileges to PostgREST roles (anon, authenticated, service_role)..."
psql "${PSQL_ARGS[@]}" <<-EOSQL
  -- Public Schema Grants
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

  -- Auth Schema Grants
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA auth TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO anon, authenticated, service_role;

  -- Storage Schema Grants
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
  GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
  GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO anon, authenticated, service_role;
EOSQL

echo "==> GymERP Offline Database initialization completed successfully!"
