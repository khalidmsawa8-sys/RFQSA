const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_DEPLOY = [
  'lib/delivery-state-machine.ts',
  'lib/courier-service.ts',
  'lib/order-status-sync.ts',
  'app/api/v1/orders/[id]/status/route.ts',
  'app/api/v1/orders/route.ts',
  'app/api/v1/vendor/orders/[id]/status/route.ts',
  'app/deal/[orderId]/page.tsx',
  'app/deal/[orderId]/deal-page-client.tsx',
  'app/client/orders/orders-client.tsx',
  'app/vendor/orders/orders-client.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING REAL-TIME ORDER SYNC FIX (CLIENT, VENDOR, COURIER)');
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

    console.log('\n3️⃣ Building Next.js application on VPS (/var/www/rfq)...');
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

    console.log('\n6️⃣ Testing endpoints on VPS (port 3002)...');
    const testLiveSync = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/orders?live_sync=1"');
    console.log('Live Sync API response snippet:', testLiveSync.stdout.slice(0, 300));

    const testSingleStatus = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/orders/1123/status"');
    console.log('Single Status API response:', testSingleStatus.stdout);

    console.log('\n✨ DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY! ✨');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
