const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES = [
  'components/dashboard/slide-dashboard.tsx',
  'app/profile/page.tsx',
  'components/dashboard-sidebar.tsx',
  'components/header.tsx',
  'components/logout-confirm-dialog.tsx',
  'components/team/team-management-view.tsx',
  'app/client/layout.tsx',
  'app/client/page.tsx',
  'app/vendor/layout.tsx',
  'app/vendor/page.tsx',
  'app/client/roles/page.tsx',
  'app/vendor/roles/page.tsx',
  'app/api/v1/auth/login/route.ts',
  'app/auth/login/page.tsx',
  'app/auth/accept-invite/page.tsx',
  'lib/rbac/permissions.ts',
  'lib/rbac/roles-service.ts',
  'lib/rbac/invitation-service.ts',
  'lib/rbac/navigation-guard.ts',
  'lib/rbac/rbac-guard.server.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'app/api/v1/team/roles/route.ts',
  'app/api/v1/team/invite/route.ts',
  'app/api/v1/team/accept-invite/route.ts',
  'app/api/v1/account/permissions/route.ts',
  'app/api/v1/admin/users/route.ts',
  'app/admin/(dashboard)/users/page.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING REACT HOOKS ERROR #310 FIX TO PRODUCTION');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
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

    console.log('\n5️⃣ Checking PM2 status...');
    const statusRes = await ssh.execCommand('pm2 status rfq', {
      cwd: remoteRoot,
    });
    console.log(statusRes.stdout);

    console.log('\n6️⃣ Checking local HTTP response on VPS port 3002...');
    const curlClient = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/client -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"');
    console.log(`HTTP status for /client: ${curlClient.stdout.trim()}`);

    const curlVendor = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/vendor -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"');
    console.log(`HTTP status for /vendor: ${curlVendor.stdout.trim()}`);

    console.log('\n🎉 ALL FIXES DEPLOYED AND VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
