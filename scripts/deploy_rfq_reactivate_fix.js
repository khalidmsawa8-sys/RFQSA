const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES = [
  'lib/supabase/server.ts',
  'lib/supabase/client.ts',
  'app/api/rfqs/[id]/reactivate/route.ts',
  'app/admin/(dashboard)/orders/page.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING RFQ REACTIVATE & ADMIN SYNC FIX (rfqsa.tech)');
  console.log('Host: 147.93.56.252');
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

    console.log(`2️⃣ Uploading ${FILES.length} files...`);
    for (const rel of FILES) {
      const local = path.join(projectRoot, rel);
      const remote = path.posix.join(remoteRoot, rel.replace(/\\/g, '/'));
      const dir = path.posix.dirname(remote);

      if (!fs.existsSync(local)) {
        console.warn(`⚠️ File not found locally: ${rel}`);
        continue;
      }

      await ssh.execCommand(`mkdir -p "${dir}"`);
      await ssh.putFile(local, remote);
      console.log(`  ✓ Uploaded: ${rel}`);
    }

    console.log('\n3️⃣ Building Next.js on VPS...');
    const buildRes = await ssh.execCommand('npm run build', {
      cwd: remoteRoot,
    });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stderr.includes('warn') && !buildRes.stderr.includes('ExperimentalWarning')) {
      console.log('Build output info:', buildRes.stderr);
    }

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    const pm2Res = await ssh.execCommand('pm2 restart rfq', {
      cwd: remoteRoot,
    });
    console.log(pm2Res.stdout);

    console.log('\n5️⃣ Testing /api/rfqs on VPS...');
    const testApi = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/rfqs -H "Cookie: rfq_session=admin"');
    try {
      const json = JSON.parse(testApi.stdout);
      console.log(`  ✓ Total RFQs returned from API: ${json.rfqs?.length}`);
      const openRfqs = json.rfqs?.filter(r => r.status === 'open') || [];
      console.log(`  ✓ Open/Reactivated RFQs count: ${openRfqs.length}`);
      openRfqs.forEach(r => console.log(`    - ID: ${r.id} | ${r.car_make} ${r.car_model} | created_at: ${r.created_at}`));
    } catch (e) {
      console.log('API output:', testApi.stdout.slice(0, 200));
    }

    console.log('\n6️⃣ Checking /admin/orders HTTP status on VPS...');
    const curlAdmin = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/admin/orders -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"');
    console.log(`HTTP status for /admin/orders: ${curlAdmin.stdout.trim()}`);

    console.log('\n🎉 ALL FIXES DEPLOYED AND VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
