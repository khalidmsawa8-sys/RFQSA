const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING ROLE SEPARATION & DATA ISOLATION FIX');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const projectRoot = path.join(__dirname, '..');
    const filesToUpload = [
      { local: 'app/api/v1/admin/users/route.ts', remote: '/var/www/rfq/app/api/v1/admin/users/route.ts' },
      { local: 'lib/supabase/server.ts', remote: '/var/www/rfq/lib/supabase/server.ts' },
      { local: 'lib/supabase/client.ts', remote: '/var/www/rfq/lib/supabase/client.ts' },
      { local: 'app/auth/login/page.tsx', remote: '/var/www/rfq/app/auth/login/page.tsx' },
      { local: 'lib/rbac/rbac-guard.server.ts', remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts' },
      { local: 'app/vendor/page.tsx', remote: '/var/www/rfq/app/vendor/page.tsx' },
      { local: 'app/client/page.tsx', remote: '/var/www/rfq/app/client/page.tsx' },
      { local: 'components/dashboard/slide-dashboard.tsx', remote: '/var/www/rfq/components/dashboard/slide-dashboard.tsx' },
      { local: 'app/client/invoices/page.tsx', remote: '/var/www/rfq/app/client/invoices/page.tsx' },
    ];

    console.log('2️⃣ Uploading modified files...');
    for (const f of filesToUpload) {
      const src = path.join(projectRoot, ...f.local.split('/'));
      await ssh.putFile(src, f.remote);
      console.log(`  ✓ Uploaded ${f.local}`);
    }
    console.log('✅ All files uploaded successfully!\n');

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: '/var/www/rfq' });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) console.error('STDERR:', res.stderr);
        else console.log('NOTICE:', res.stderr);
      }
      return res;
    };

    console.log('3️⃣ Building Next.js application on VPS...');
    const buildRes = await execute('npm run build', 'Next.js Build');
    if (buildRes.code !== 0) {
      console.error('❌ Build failed on server!');
      process.exit(1);
    }

    console.log('4️⃣ Restarting PM2 process...');
    await execute('pm2 restart rfq', 'PM2 Restart');

    console.log('\n🎉 ALL DONE! Deployment finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  }
}

deploy();
