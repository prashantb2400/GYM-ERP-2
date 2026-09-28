/**
 * CLI runner for Cloudflare Tunnel
 *
 * Runs standalone or alongside the bridge to expose localhost:48291
 * and print connection details for the GymERP dashboard.
 */

import { startTunnel, stopTunnel } from '../src/tunnel.js';

console.log('====================================================');
console.log('  GymERP WhatsApp Bridge: Cloudflare Tunnel Runner  ');
console.log('====================================================');

async function main() {
  const status = await startTunnel(48291);

  if (status.active) {
    console.log('\n[SUCCESS] Cloudflare Tunnel is LIVE!');
    console.log(`Mode: ${status.mode.toUpperCase()}`);
    if (status.url) {
      console.log(`Bridge Public URL: ${status.url}`);
      console.log('\nCopy and paste this URL into your GymERP Dashboard under:');
      console.log('  Settings > Integrations > WhatsApp > Bridge URL');
    }
    console.log('\nPress Ctrl+C to shut down tunnel.');
  } else {
    console.error('\n[FAILED] Could not establish tunnel.');
    if (status.error) {
      console.error(`Reason: ${status.error}`);
    }
    console.log('\nRun "npm run setup:tunnel" to install cloudflared first.');
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    console.log('\nClosing Cloudflare Tunnel...');
    await stopTunnel();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal tunnel error:', err);
  process.exit(1);
});
