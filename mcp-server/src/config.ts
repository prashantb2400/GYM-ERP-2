import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Attempt to load .env.local from project root first, then .env
const rootDir = path.resolve(__dirname, '../../');
const envLocalPath = path.join(rootDir, '.env.local');
const envPath = path.join(rootDir, '.env');

// Ensure dotenv does not emit banner to stdout which breaks JSON-RPC
process.env.DOTENV_CONFIG_QUIET = 'true';

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, quiet: true });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

export interface McpServerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  defaultGymId?: string;
  serverName: string;
  serverVersion: string;
}

export function getConfig(): McpServerConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const defaultGymId = process.env.GYMERP_GYM_ID || process.env.DEFAULT_GYM_ID;

  return {
    supabaseUrl,
    supabaseKey,
    defaultGymId,
    serverName: 'gym-erp-mcp',
    serverVersion: '1.0.0',
  };
}
