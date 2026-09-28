/**
 * Standalone Sidecar Builder for Tauri Desktop App
 *
 * Compiles the WhatsApp Bridge and fetches Cloudflare Tunnel binaries,
 * naming them with Tauri target triples:
 *   baileys-engine-<target>[.exe]
 *   cloudflared-<target>[.exe]
 *
 * Output directory: desktop/src-tauri/bin/
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = path.resolve(process.cwd(), '../desktop/src-tauri/bin');

function getHostTargetTriple(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') {
    return arch === 'x64' ? 'x86_64-pc-windows-msvc' : 'i686-pc-windows-msvc';
  } else if (platform === 'linux') {
    return arch === 'x64' ? 'x86_64-unknown-linux-gnu' : 'aarch64-unknown-linux-gnu';
  } else if (platform === 'darwin') {
    return arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  }
  return `${arch}-${platform}`;
}

async function buildSidecars() {
  console.log('====================================================');
  console.log('  GymERP Desktop Sidecar Builder                    ');
  console.log('====================================================');

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  const targetTriple = getHostTargetTriple();
  const isWindows = process.platform === 'win32';
  const ext = isWindows ? '.exe' : '';
  const baileysOut = path.join(TARGET_DIR, `baileys-engine-${targetTriple}${ext}`);
  const cloudflaredOut = path.join(TARGET_DIR, `cloudflared-${targetTriple}${ext}`);

  console.log(`\nTarget Platform: ${targetTriple}`);
  console.log(`Destination: ${TARGET_DIR}`);

  // 1. Build Baileys Engine
  console.log('\n[*] Compiling Baileys Engine sidecar...');
  let bunAvailable = false;
  try {
    execSync('bun --version', { stdio: 'ignore' });
    bunAvailable = true;
  } catch {
    bunAvailable = false;
  }

  if (bunAvailable) {
    console.log('[*] Found Bun! Compiling standalone binary...');
    execSync(`bun build --compile src/index.ts --outfile "${baileysOut}"`, { stdio: 'inherit' });
    console.log(`[SUCCESS] Baileys binary generated: ${baileysOut}`);
  } else {
    console.log('[*] Bun not found. Generating portable Node executable bundle...');
    // Create standalone entry runner script
    const runnerContent = isWindows
      ? `@echo off\r\nnode "%~dp0..\\..\\..\\whatsapp-bridge\\src\\index.ts" %*\r\n`
      : `#!/bin/sh\nexec node "$(dirname "$0")/../../../whatsapp-bridge/src/index.ts" "$@"\n`;

    fs.writeFileSync(baileysOut, runnerContent, { mode: 0o755 });
    console.log(`[OK] Executable launcher generated: ${baileysOut}`);
  }

  // 2. Fetch or prepare cloudflared binary
  console.log('\n[*] Checking cloudflared sidecar...');
  let systemCloudflared = '';
  try {
    systemCloudflared = execSync(isWindows ? 'where cloudflared' : 'which cloudflared')
      .toString()
      .trim()
      .split('\n')[0];
  } catch {
    systemCloudflared = '';
  }

  if (systemCloudflared && fs.existsSync(systemCloudflared)) {
    console.log(`[*] Found system cloudflared at ${systemCloudflared}. Copying to sidecars...`);
    fs.copyFileSync(systemCloudflared, cloudflaredOut);
    fs.chmodSync(cloudflaredOut, 0o755);
    console.log(`[SUCCESS] cloudflared copied to: ${cloudflaredOut}`);
  } else {
    console.log('[!] System cloudflared not found in PATH.');
    console.log('    Run "npm run setup:tunnel" to download official cloudflared binary,');
    console.log(`    or place the binary at: ${cloudflaredOut}`);
  }

  console.log('\n[DONE] Sidecar build preparation complete!');
}

buildSidecars().catch((err) => {
  console.error('Fatal sidecar build error:', err);
  process.exit(1);
});
