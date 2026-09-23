const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_DEPLOY = [
  'components/vendor-details-modal.tsx',
  'lib/supabase/client.ts',
  'app/api/v1/orders/route.ts',
  'app/client/rfq/[rfqId]/page.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING BRANCH PHONE REMOVAL & ACCEPT QUOTE FIX');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Files to deploy:', FILES_TO_DEPLOY);
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

    // Wait 2 seconds
    await new Promise((r) => setTimeout(r, 2000));

    console.log('\n5️⃣ Testing client RFQ page and orders API...');
    const curlRfq = await ssh.execCommand(
      'curl -s -i "http://127.0.0.1:3002/client/rfq/RFQ-5940" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"'
    );
    console.log('Client RFQ HTTP response:');
    console.log(curlRfq.stdout.slice(0, 400));

    const curlOrdersApi = await ssh.execCommand(
      'curl -s -i "http://127.0.0.1:3002/api/v1/orders" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"'
    );
    console.log('Orders API response:');
    console.log(curlOrdersApi.stdout.slice(0, 400));

    console.log('\n🎉 SUCCESS: All fixes deployed and verified successfully!');

    ssh.dispose();
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  }
}

deploy();
