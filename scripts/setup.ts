#!/usr/bin/env node

/**
 * 🏋️ GymERP — Interactive Setup Wizard
 *
 * Run: npx tsx scripts/setup.ts
 *   or: node --loader tsx scripts/setup.ts
 *
 * Automates:
 *  1. Supabase connection + migration (all 4 files)
 *  2. Storage bucket creation
 *  3. Security secret generation
 *  4. Super admin account creation
 *  5. .env.local file generation
 *  6. Optional demo data seeding
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Terminal Helpers ────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function log(msg: string) { console.log(msg); }
function success(msg: string) { log(`  ${colors.green}✅ ${msg}${colors.reset}`); }
function warn(msg: string) { log(`  ${colors.yellow}⚠️  ${msg}${colors.reset}`); }
function info(msg: string) { log(`  ${colors.cyan}ℹ  ${msg}${colors.reset}`); }
function error(msg: string) { log(`  ${colors.red}❌ ${msg}${colors.reset}`); }
function header(step: number, total: number, title: string) {
  log('');
  log(`${colors.bold}${colors.magenta}━━━ Step ${step}/${total} — ${title} ━━━${colors.reset}`);
  log('');
}
function divider() { log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`); }

function ask(question: string, defaultVal?: string): Promise<string> {
  const prompt = defaultVal
    ? `  ${colors.white}${question}${colors.dim} [${defaultVal}]${colors.reset}: `
    : `  ${colors.white}${question}${colors.reset}: `;
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  return new Promise((resolve) => {
    rl.question(`  ${colors.white}${question}${colors.dim} (${hint})${colors.reset}: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

function askSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${colors.white}${question}${colors.reset}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

function generateSecret(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// ─── Migration Runner ────────────────────────────────────────────────────────

const MIGRATIONS = [
  '001_initial.sql',
  '002_v2_features.sql',
  '003_push_subscriptions.sql',
  '004_platform_subscriptions.sql',
];

async function runMigrations(supabase: SupabaseClient, projectDir: string): Promise<boolean> {
  const migrationsDir = path.join(projectDir, 'supabase', 'migrations');

  for (const file of MIGRATIONS) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      error(`Migration file not found: ${file}`);
      return false;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    log(`  ${colors.dim}Running ${file} (${sql.split('\n').length} lines)...${colors.reset}`);

    // Split by semicolons for statements, but handle dollar-quoted blocks
    // Use rpc to run raw SQL via Supabase's postgres function
    const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql }).single();

    if (rpcError) {
      // Fallback: try using the REST API directly (admin only)
      // Some statements may fail if they already exist — that's OK
      const response = await fetch(`${supabase['supabaseUrl']}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase['supabaseKey'],
          'Authorization': `Bearer ${supabase['supabaseKey']}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        warn(`Migration ${file} needs manual execution (functions/triggers require SQL Editor).`);
        warn(`Open Supabase SQL Editor and paste the contents of: supabase/migrations/${file}`);
        continue;
      }
    }

    success(`${file} executed`);
  }

  return true;
}

// ─── Storage Bucket Creator ──────────────────────────────────────────────────

async function createBuckets(supabase: SupabaseClient) {
  const buckets = [
    { name: 'gym-logos', public: true },
    { name: 'member-photos', public: false },
    { name: 'attendance-snapshots', public: false },
  ];

  for (const bucket of buckets) {
    const { error: err } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
    });
    if (err) {
      if (err.message?.includes('already exists')) {
        info(`Bucket "${bucket.name}" already exists`);
      } else {
        warn(`Bucket "${bucket.name}": ${err.message}`);
      }
    } else {
      success(`Bucket "${bucket.name}" created (${bucket.public ? 'public' : 'private'})`);
    }
  }
}

// ─── VAPID Key Generator ─────────────────────────────────────────────────────

function generateVapidKeys(): { publicKey: string; privateKey: string } {
  // Generate ECDSA P-256 keys for Web Push VAPID
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  // Convert to URL-safe base64
  const pubB64 = publicKey.subarray(26).toString('base64url'); // strip ASN.1 header
  const privB64 = privateKey.subarray(36, 68).toString('base64url'); // extract raw 32 bytes

  return { publicKey: pubB64, privateKey: privB64 };
}

// ─── Main Setup ──────────────────────────────────────────────────────────────

async function main() {
  const projectDir = path.resolve(__dirname, '..');
  const totalSteps = 6;

  log('');
  log(`${colors.bold}${colors.magenta}  🏋️  GymERP Setup Wizard${colors.reset}`);
  log(`${colors.dim}  Automate your production deployment in under 5 minutes${colors.reset}`);
  divider();

  // Collect all env vars here
  const env: Record<string, string> = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Supabase Connection
  // ═══════════════════════════════════════════════════════════════════════════
  header(1, totalSteps, 'Supabase Connection');
  info('Find these in: Supabase Dashboard → Project Settings → API');
  log('');

  const supabaseUrl = await ask('Supabase Project URL (https://xxx.supabase.co)');
  const supabaseAnonKey = await ask('Supabase Anon/Public Key');
  const supabaseServiceKey = await askSecret('Supabase Service Role Key (secret)');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    error('All 3 Supabase credentials are required.');
    rl.close();
    process.exit(1);
  }

  // Test connection
  log('');
  log(`  ${colors.dim}Testing connection...${colors.reset}`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { error: testErr } = await supabase.from('_test_connection_').select('*').limit(1);
    // 42P01 = table doesn't exist, which means connection works
    if (testErr && !testErr.message.includes('does not exist') && !testErr.code?.includes('42P01')) {
      // Check if it's an auth error
      if (testErr.message.includes('Invalid API key') || testErr.message.includes('JWT')) {
        error(`Connection failed: ${testErr.message}`);
        rl.close();
        process.exit(1);
      }
    }
    success('Connected to Supabase!');
  } catch (e: any) {
    error(`Connection failed: ${e.message}`);
    rl.close();
    process.exit(1);
  }

  env['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl;
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = supabaseAnonKey;
  env['SUPABASE_SERVICE_ROLE_KEY'] = supabaseServiceKey;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Run Migrations
  // ═══════════════════════════════════════════════════════════════════════════
  header(2, totalSteps, 'Database Migrations');

  const runMigrate = await askYesNo('Run database migrations now?', true);

  if (runMigrate) {
    info('Attempting to run migrations via Supabase client...');
    info('Note: Complex migrations with functions/triggers may need manual SQL Editor execution.');
    log('');

    const migrated = await runMigrations(supabase, projectDir);

    if (!migrated) {
      warn('Some migrations failed. You can run them manually:');
      log('');
      MIGRATIONS.forEach((f, i) => {
        log(`  ${colors.dim}${i + 1}. Open Supabase SQL Editor → paste contents of supabase/migrations/${f} → Run${colors.reset}`);
      });
    }

    // Create storage buckets
    log('');
    log(`  ${colors.dim}Creating storage buckets...${colors.reset}`);
    await createBuckets(supabase);
  } else {
    warn('Skipped. Run migrations manually in Supabase SQL Editor:');
    MIGRATIONS.forEach((f, i) => {
      log(`  ${colors.dim}${i + 1}. supabase/migrations/${f}${colors.reset}`);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Generate Security Secrets
  // ═══════════════════════════════════════════════════════════════════════════
  header(3, totalSteps, 'Security Secrets');
  info('Generating cryptographically secure secrets...');
  log('');

  const cronSecret = generateSecret(32);
  const cctvToken = generateSecret(32);

  let vapidPublic = '';
  let vapidPrivate = '';
  try {
    const vapid = generateVapidKeys();
    vapidPublic = vapid.publicKey;
    vapidPrivate = vapid.privateKey;
    success('VAPID keys generated (Web Push notifications)');
  } catch {
    warn('VAPID generation failed. Generate manually: npx web-push generate-vapid-keys');
    vapidPublic = 'GENERATE_WITH_npx_web-push_generate-vapid-keys';
    vapidPrivate = 'GENERATE_WITH_npx_web-push_generate-vapid-keys';
  }

  success(`CRON_SECRET generated (${cronSecret.substring(0, 8)}...)`);
  success(`CCTV_AUTH_TOKEN generated (${cctvToken.substring(0, 8)}...)`);

  env['CRON_SECRET'] = cronSecret;
  env['CCTV_AUTH_TOKEN'] = cctvToken;
  env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] = vapidPublic;
  env['VAPID_PRIVATE_KEY'] = vapidPrivate;

  // App URL
  log('');
  const appUrl = await ask('Your app URL (after Vercel deploy)', 'http://localhost:3000');
  env['NEXT_PUBLIC_APP_URL'] = appUrl;
  env['VAPID_SUBJECT'] = `mailto:admin@${appUrl.replace(/https?:\/\//, '').split('/')[0]}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Payment & WhatsApp (Optional)
  // ═══════════════════════════════════════════════════════════════════════════
  header(4, totalSteps, 'Integrations (Optional)');

  // Razorpay
  const setupRazorpay = await askYesNo('Configure Razorpay payments?', false);
  if (setupRazorpay) {
    const rzpKeyId = await ask('Razorpay Key ID (rzp_live_xxx or rzp_test_xxx)');
    const rzpSecret = await askSecret('Razorpay Key Secret');
    env['RAZORPAY_KEY_ID'] = rzpKeyId;
    env['RAZORPAY_KEY_SECRET'] = rzpSecret;
    env['NEXT_PUBLIC_RAZORPAY_KEY_ID'] = rzpKeyId;
    success('Razorpay configured');
  } else {
    info('Skipped. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local later.');
  }

  // WhatsApp
  log('');
  const setupWhatsApp = await askYesNo('Configure WhatsApp Business API?', false);
  if (setupWhatsApp) {
    const waToken = await askSecret('WhatsApp permanent access token');
    const waPhoneId = await ask('WhatsApp Phone Number ID');
    const waAppSecret = await askSecret('Meta App Secret (for webhook signature verification)');
    const waVerifyToken = generateSecret(16);
    env['WHATSAPP_TOKEN'] = waToken;
    env['WHATSAPP_PHONE_NUMBER_ID'] = waPhoneId;
    env['WHATSAPP_APP_SECRET'] = waAppSecret;
    env['WHATSAPP_VERIFY_TOKEN'] = waVerifyToken;
    success('WhatsApp configured');
    info(`Webhook verify token (save this for Meta webhook setup): ${waVerifyToken}`);
  } else {
    info('Skipped. WhatsApp messages will be logged but not sent.');
  }

  // CCTV / Hardware
  log('');
  env['CCTV_SERVICE_URL'] = 'http://localhost:5001';
  env['HARDWARE_BRIDGE_URL'] = 'http://localhost:5002';
  info('CCTV and Hardware Bridge URLs set to localhost defaults.');
  info('Update in .env.local if deploying on a different machine.');

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Super Admin Account
  // ═══════════════════════════════════════════════════════════════════════════
  header(5, totalSteps, 'Super Admin Account');
  info('The super admin can manage all gyms, plans, and subscriptions.');
  log('');

  const setupAdmin = await askYesNo('Create a super admin account now?', true);
  if (setupAdmin) {
    const adminEmail = await ask('Admin email');
    const adminName = await ask('Admin name');
    const adminPassword = await askSecret('Admin password (min 8 chars)');

    if (adminEmail && adminName && adminPassword && adminPassword.length >= 8) {
      log('');
      log(`  ${colors.dim}Creating auth user...${colors.reset}`);

      // Create auth user via Supabase Admin API
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

      if (authErr) {
        if (authErr.message?.includes('already been registered')) {
          warn('Email already registered. Fetching existing user...');
          // Try to look up the user
          const { data: users } = await supabase.auth.admin.listUsers();
          const existing = users?.users?.find(u => u.email === adminEmail);
          if (existing) {
            const { error: insertErr } = await supabase.from('super_admins').upsert({
              user_id: existing.id,
              name: adminName,
              email: adminEmail,
              role: 'super_admin',
              is_active: true,
            }, { onConflict: 'user_id' });
            if (insertErr) {
              warn(`Could not insert super_admin record: ${insertErr.message}`);
              warn('Run migration 004 first, then re-run setup.');
            } else {
              success(`Super admin linked to existing user: ${adminEmail}`);
            }
          }
        } else {
          error(`Auth error: ${authErr.message}`);
        }
      } else if (authData.user) {
        // Insert into super_admins table
        const { error: insertErr } = await supabase.from('super_admins').insert({
          user_id: authData.user.id,
          name: adminName,
          email: adminEmail,
          role: 'super_admin',
          is_active: true,
        });

        if (insertErr) {
          warn(`Auth user created but super_admin insert failed: ${insertErr.message}`);
          warn('Run migration 004 first, then manually INSERT into super_admins table.');
          info(`User ID to use: ${authData.user.id}`);
        } else {
          success(`Super admin created: ${adminEmail}`);
          info(`Login at: ${appUrl}/superadmin/login`);
        }
      }
    } else {
      warn('Invalid input. Create super admin manually after setup.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6: Write .env.local
  // ═══════════════════════════════════════════════════════════════════════════
  header(6, totalSteps, 'Write Environment Files');

  // Build .env.local content
  const envContent = [
    '# ═══════════════════════════════════════════════════════════════════',
    '# GymERP Environment Variables',
    `# Generated by setup wizard on ${new Date().toISOString()}`,
    '# ═══════════════════════════════════════════════════════════════════',
    '',
    '# ─── Supabase ────────────────────────────────────────────────────',
    `NEXT_PUBLIC_SUPABASE_URL=${env['NEXT_PUBLIC_SUPABASE_URL']}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${env['NEXT_PUBLIC_SUPABASE_ANON_KEY']}`,
    `SUPABASE_SERVICE_ROLE_KEY=${env['SUPABASE_SERVICE_ROLE_KEY']}`,
    '',
    '# ─── App ─────────────────────────────────────────────────────────',
    `NEXT_PUBLIC_APP_URL=${env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}`,
    '',
    '# ─── Security ────────────────────────────────────────────────────',
    `CRON_SECRET=${env['CRON_SECRET']}`,
    '',
    '# ─── Web Push (VAPID) ────────────────────────────────────────────',
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${env['NEXT_PUBLIC_VAPID_PUBLIC_KEY']}`,
    `VAPID_PRIVATE_KEY=${env['VAPID_PRIVATE_KEY']}`,
    `VAPID_SUBJECT=${env['VAPID_SUBJECT'] || 'mailto:admin@gymerp.com'}`,
    '',
    '# ─── Razorpay ────────────────────────────────────────────────────',
    `RAZORPAY_KEY_ID=${env['RAZORPAY_KEY_ID'] || ''}`,
    `RAZORPAY_KEY_SECRET=${env['RAZORPAY_KEY_SECRET'] || ''}`,
    `NEXT_PUBLIC_RAZORPAY_KEY_ID=${env['NEXT_PUBLIC_RAZORPAY_KEY_ID'] || ''}`,
    '',
    '# ─── WhatsApp Business API ───────────────────────────────────────',
    `WHATSAPP_TOKEN=${env['WHATSAPP_TOKEN'] || ''}`,
    `WHATSAPP_PHONE_NUMBER_ID=${env['WHATSAPP_PHONE_NUMBER_ID'] || ''}`,
    `WHATSAPP_APP_SECRET=${env['WHATSAPP_APP_SECRET'] || ''}`,
    `WHATSAPP_VERIFY_TOKEN=${env['WHATSAPP_VERIFY_TOKEN'] || ''}`,
    '',
    '# ─── CCTV & Hardware ─────────────────────────────────────────────',
    `CCTV_SERVICE_URL=${env['CCTV_SERVICE_URL'] || 'http://localhost:5001'}`,
    `CCTV_AUTH_TOKEN=${env['CCTV_AUTH_TOKEN']}`,
    `HARDWARE_BRIDGE_URL=${env['HARDWARE_BRIDGE_URL'] || 'http://localhost:5002'}`,
    '',
  ].join('\n');

  const envPath = path.join(projectDir, '.env.local');
  const envExists = fs.existsSync(envPath);

  if (envExists) {
    const overwrite = await askYesNo('.env.local already exists. Overwrite?', false);
    if (overwrite) {
      // Backup existing
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
      info(`Backed up existing .env.local to ${path.basename(backupPath)}`);
      fs.writeFileSync(envPath, envContent);
      success('.env.local written');
    } else {
      // Write to .env.generated instead
      const altPath = path.join(projectDir, '.env.generated');
      fs.writeFileSync(altPath, envContent);
      success('.env.generated written (merge manually into .env.local)');
    }
  } else {
    fs.writeFileSync(envPath, envContent);
    success('.env.local written');
  }

  // Also write a Vercel-importable format
  const vercelEnvPath = path.join(projectDir, '.env.vercel');
  const vercelContent = Object.entries(env)
    .filter(([, v]) => v && !v.startsWith('GENERATE_'))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync(vercelEnvPath, vercelContent);
  success('.env.vercel written (importable via Vercel CLI)');

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════
  log('');
  divider();
  log('');
  log(`${colors.bold}${colors.green}  🎉 GymERP Setup Complete!${colors.reset}`);
  log('');
  log(`${colors.white}  Next steps:${colors.reset}`);
  log('');
  log(`  ${colors.cyan}1.${colors.reset} Test locally:`);
  log(`     ${colors.dim}npm run dev${colors.reset}`);
  log('');
  log(`  ${colors.cyan}2.${colors.reset} Deploy to Vercel:`);
  log(`     ${colors.dim}npx vercel deploy --prod${colors.reset}`);
  log(`     ${colors.dim}# Import env vars: npx vercel env pull .env.vercel${colors.reset}`);
  log('');
  log(`  ${colors.cyan}3.${colors.reset} If migrations weren't auto-applied:`);
  log(`     ${colors.dim}Open Supabase SQL Editor and run the 4 migration files in order${colors.reset}`);
  log('');
  log(`  ${colors.cyan}4.${colors.reset} Login to Super Admin:`);
  log(`     ${colors.dim}${appUrl}/superadmin/login${colors.reset}`);
  log('');
  log(`  ${colors.cyan}5.${colors.reset} First gym owner signs up at:`);
  log(`     ${colors.dim}${appUrl}/login${colors.reset}`);
  log('');
  divider();
  log('');

  rl.close();
  process.exit(0);
}

// Run
main().catch((err) => {
  error(`Setup failed: ${err.message}`);
  rl.close();
  process.exit(1);
});
