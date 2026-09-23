const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_DEPLOY = [
  'app/deal/[orderId]/deal-page-client.tsx',
  'app/deal/[orderId]/page.tsx',
  'app/client/rfq/[rfqId]/page.tsx',
  'app/client/orders/orders-client.tsx',
  'app/api/v1/orders/route.ts',
  'lib/order-status-sync.ts',
  'lib/supabase/server.ts',
  'components/vendor-branch-map-modal.tsx',
  'components/location-picker-dialog.tsx',
  'components/fleet/branch-location-map-picker.tsx',
  'components/vendors-map/vendors-map-client.tsx',
  'components/quote-details-inspection-modal.tsx',
  'app/vendor/orders/orders-client.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING ORDER LIFECYCLE & DEAL STEPPER WORKFLOW');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Files to deploy:');
  FILES_TO_DEPLOY.forEach(f => console.log(`  - ${f}`));
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting via SSH...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const projectRoot = path.join(__dirname, '..');
    const remoteRoot = '/var/www/rfq';

    console.log('2️⃣ Uploading files...');
    for (const rel of FILES_TO_DEPLOY) {
      const local = path.join(projectRoot, rel);
      const remote = path.posix.join(remoteRoot, rel.replace(/\\/g, '/'));
      const dir = path.posix.dirname(remote);

      if (!fs.existsSync(local)) {
        throw new Error(`Local file missing: ${local}`);
      }

      await ssh.execCommand(`mkdir -p "${dir}"`);
      await ssh.putFile(local, remote);
      console.log(`  ✓ Uploaded: ${rel}`);
    }

    console.log('\n3️⃣ Building Next.js application on VPS...');
    const buildRes = await ssh.execCommand('npm run build', {
      cwd: remoteRoot,
    });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stderr.includes('warn') && !buildRes.stderr.includes('ExperimentalWarning')) {
      console.log('Build Stderr:', buildRes.stderr);
    }

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    const pm2Res = await ssh.execCommand('pm2 restart rfq', {
      cwd: remoteRoot,
    });
    console.log(pm2Res.stdout);

    console.log('\n5️⃣ Verifying PM2 process status...');
    const pm2Status = await ssh.execCommand('pm2 status rfq', {
      cwd: remoteRoot,
    });
    console.log(pm2Status.stdout);

    console.log('\n✨ DEPLOYMENT COMPLETED SUCCESSFULLY! ✨');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
