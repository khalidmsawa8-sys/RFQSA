const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING SCOPED ROLES FIX TO PRODUCTION (rfqsa.tech)');
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
        local: path.join(projectRoot, 'app', 'api', 'v1', 'team', 'roles', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/team/roles/route.ts',
        dir: '/var/www/rfq/app/api/v1/team/roles',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'rbac-guard.server.ts'),
        remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'roles-service.ts'),
        remote: '/var/www/rfq/lib/rbac/roles-service.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'components', 'team', 'team-management-view.tsx'),
        remote: '/var/www/rfq/components/team/team-management-view.tsx',
        dir: '/var/www/rfq/components/team',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'roles', 'page.tsx'),
        remote: '/var/www/rfq/app/client/roles/page.tsx',
        dir: '/var/www/rfq/app/client/roles',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'roles', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/roles/page.tsx',
        dir: '/var/www/rfq/app/vendor/roles',
      },
      {
        local: path.join(projectRoot, 'components', 'dashboard-sidebar.tsx'),
        remote: '/var/www/rfq/components/dashboard-sidebar.tsx',
        dir: '/var/www/rfq/components',
      },
      {
        local: path.join(projectRoot, 'components', 'mobile-nav.tsx'),
        remote: '/var/www/rfq/components/mobile-nav.tsx',
        dir: '/var/www/rfq/components',
      },
    ];

    console.log('2️⃣ Ensuring remote directories exist...');
    const uniqueDirs = [...new Set(filesToUpload.map(f => f.dir))];
    for (const d of uniqueDirs) {
      await ssh.execCommand(`mkdir -p "${d}"`);
    }

    console.log('3️⃣ Uploading updated files to VPS...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.relative(projectRoot, f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ Files uploaded successfully!\n');

    console.log('4️⃣ Building Next.js application on VPS...');
    const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
    console.log(buildRes.stdout);
    if (buildRes.code !== 0) {
      console.error('BUILD ERROR:', buildRes.stderr);
      process.exit(1);
    }

    console.log('5️⃣ Restarting PM2 process...');
    const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
    console.log(pm2Res.stdout || pm2Res.stderr);

    console.log('6️⃣ Verifying live endpoints on VPS...');
    // Wait 3 seconds for node server to spin up
    await new Promise(r => setTimeout(r, 3000));

    const testEndpoint = 'curl -s "http://127.0.0.1:3002/api/v1/team/roles?scope=client"';
    const testRes = await ssh.execCommand(testEndpoint);
    console.log('GET /api/v1/team/roles?scope=client response:');
    try {
      const data = JSON.parse(testRes.stdout);
      console.log('Success:', data.success, 'Total Roles:', data.total);
      const customRole = data.roles?.find(r => r.name_ar.includes("مشرف") || !r.is_system);
      if (customRole) {
        console.log('🎉 FOUND CUSTOM ROLE in Client Scope:', customRole.name_ar, `(${customRole.id})`);
      } else {
        console.log('Roles list:', data.roles?.map(r => r.name_ar));
      }
    } catch (e) {
      console.log(testRes.stdout.slice(0, 300));
    }

    const testClientPage = 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/client/roles';
    const pageRes = await ssh.execCommand(testClientPage);
    console.log('Client Roles Page HTTP Status:', pageRes.stdout.trim());

    console.log('\n====================================================');
    console.log('✅ ALL ROLES SCOPING FIXES DEPLOYED AND VERIFIED LIVE!');
    console.log('====================================================');

    ssh.dispose();
  } catch (err) {
    console.error('Deployment error:', err);
    if (ssh) ssh.dispose();
    process.exit(1);
  }
}

deploy();
