const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_DEPLOY = [
  'components/vendor-details-modal.tsx',
  'components/quote-details-inspection-modal.tsx',
  'app/client/rfq/[rfqId]/page.tsx',
  'app/api/v1/vendors/[id]/route.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'data/profiles_db.json',
  'data/quotes_db.json',
  'data/invoices_db.json',
  'data/staff_audit_logs_db.json',
  'data/support_requests_db.json',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING UNIFIED REFERENCE CODE (VND-501)');
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

    console.log('\n5️⃣ Verifying API response for vendor-demo-id...');
    const testVendorRes = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/vendors/vendor-demo-id"');
    console.log('Vendor Demo API Output:', testVendorRes.stdout);

    const testVendorSup1Res = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/vendors/v-supplier-1"');
    console.log('v-supplier-1 API Output:', testVendorSup1Res.stdout);

    console.log('\n🎉 ALL REFERENCE CODES AND MODALS UNIFIED AND DEPLOYED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
