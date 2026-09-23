const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING USER CREATION & LOGIN SESSION ISOLATION FIX (rfqsa.tech)');
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

    const filesToUpload = [
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'auth', 'login', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/auth/login/route.ts',
        dir: '/var/www/rfq/app/api/v1/auth/login',
      },
      {
        local: path.join(projectRoot, 'app', 'auth', 'login', 'page.tsx'),
        remote: '/var/www/rfq/app/auth/login/page.tsx',
        dir: '/var/www/rfq/app/auth/login',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'server.ts'),
        remote: '/var/www/rfq/lib/supabase/server.ts',
        dir: '/var/www/rfq/lib/supabase',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'client.ts'),
        remote: '/var/www/rfq/lib/supabase/client.ts',
        dir: '/var/www/rfq/lib/supabase',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'rbac-guard.server.ts'),
        remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'components', 'header.tsx'),
        remote: '/var/www/rfq/components/header.tsx',
        dir: '/var/www/rfq/components',
      },
      {
        local: path.join(projectRoot, 'components', 'logout-confirm-dialog.tsx'),
        remote: '/var/www/rfq/components/logout-confirm-dialog.tsx',
        dir: '/var/www/rfq/components',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'users', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/users/route.ts',
        dir: '/var/www/rfq/app/api/v1/admin/users',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'users', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/users/page.tsx',
        dir: '/var/www/rfq/app/admin/(dashboard)/users',
      },
    ];

    console.log('2️⃣ Ensuring remote directories exist on VPS...');
    const uniqueDirs = [...new Set(filesToUpload.map((f) => f.dir))];
    for (const d of uniqueDirs) {
      await ssh.execCommand(`mkdir -p "${d}"`);
    }

    console.log('3️⃣ Uploading updated files to VPS...');
    for (const f of filesToUpload) {
      if (!fs.existsSync(f.local)) {
        console.error(`❌ Local file not found: ${f.local}`);
        continue;
      }
      await ssh.putFile(f.local, f.remote);
      console.log(`  ✓ Uploaded: ${path.basename(f.local)} -> ${f.remote}`);
    }

    console.log('\n4️⃣ Building Next.js on VPS...');
    const buildRes = await ssh.execCommand('npm run build', {
      cwd: '/var/www/rfq',
    });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stderr.includes('warn') && !buildRes.stderr.includes('ExperimentalWarning')) {
      console.log('Build output info:', buildRes.stderr);
    }

    console.log('5️⃣ Restarting PM2 process (rfq)...');
    const pm2Res = await ssh.execCommand('pm2 restart rfq', {
      cwd: '/var/www/rfq',
    });
    console.log(pm2Res.stdout);

    console.log('6️⃣ Checking PM2 status...');
    const statusRes = await ssh.execCommand('pm2 status rfq');
    console.log(statusRes.stdout);

    console.log('====================================================');
    console.log('🎉 DEPLOYMENT COMPLETE! All files updated & live.');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
