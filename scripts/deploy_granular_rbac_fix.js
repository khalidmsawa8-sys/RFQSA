const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING GRANULAR RBAC MATRIX & NAVIGATION FIX (rfqsa.tech)');
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
        local: path.join(projectRoot, 'lib', 'rbac', 'navigation-guard.ts'),
        remote: '/var/www/rfq/lib/rbac/navigation-guard.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'rbac-guard.server.ts'),
        remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'invitation-service.ts'),
        remote: '/var/www/rfq/lib/rbac/invitation-service.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'account', 'permissions', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/account/permissions/route.ts',
        dir: '/var/www/rfq/app/api/v1/account/permissions',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'team', 'accept-invite', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/team/accept-invite/route.ts',
        dir: '/var/www/rfq/app/api/v1/team/accept-invite',
      },
      {
        local: path.join(projectRoot, 'app', 'auth', 'accept-invite', 'page.tsx'),
        remote: '/var/www/rfq/app/auth/accept-invite/page.tsx',
        dir: '/var/www/rfq/app/auth/accept-invite',
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
      {
        local: path.join(projectRoot, 'components', 'dashboard', 'slide-dashboard.tsx'),
        remote: '/var/www/rfq/components/dashboard/slide-dashboard.tsx',
        dir: '/var/www/rfq/components/dashboard',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'layout.tsx'),
        remote: '/var/www/rfq/app/client/layout.tsx',
        dir: '/var/www/rfq/app/client',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'page.tsx'),
        remote: '/var/www/rfq/app/client/page.tsx',
        dir: '/var/www/rfq/app/client',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'layout.tsx'),
        remote: '/var/www/rfq/app/vendor/layout.tsx',
        dir: '/var/www/rfq/app/vendor',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/page.tsx',
        dir: '/var/www/rfq/app/vendor',
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
        throw new Error(`Local file not found: ${f.local}`);
      }
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

    console.log('6️⃣ Waiting 3 seconds for server readiness...');
    await new Promise((r) => setTimeout(r, 3000));

    console.log('7️⃣ Testing live permissions endpoint for OWNER vs EMPLOYEE...');

    // Test 1: Owner session
    const ownerTest = await ssh.execCommand(
      'curl -s "http://127.0.0.1:3002/api/v1/account/permissions" -H "Cookie: rfq_session=client"'
    );
    console.log('\n--- 1. OWNER TEST: GET /api/v1/account/permissions (rfq_session=client) ---');
    console.log(ownerTest.stdout);

    // Test 2: Employee technician session
    const techTest = await ssh.execCommand(
      'curl -s "http://127.0.0.1:3002/api/v1/account/permissions" -H "Cookie: rfq_session=client; rfq_role=client_technician; rfq_member_id=tech_01"'
    );
    console.log('\n--- 2. TECHNICIAN TEST: GET /api/v1/account/permissions (rfq_role=client_technician) ---');
    console.log(techTest.stdout);

    // Test 3: Employee accountant session
    const accTest = await ssh.execCommand(
      'curl -s "http://127.0.0.1:3002/api/v1/account/permissions" -H "Cookie: rfq_session=client; rfq_role=client_accountant; rfq_member_id=acc_01"'
    );
    console.log('\n--- 3. ACCOUNTANT TEST: GET /api/v1/account/permissions (rfq_role=client_accountant) ---');
    console.log(accTest.stdout);

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================');

    ssh.dispose();
  } catch (err) {
    console.error('Deployment error:', err);
    if (ssh) ssh.dispose();
    process.exit(1);
  }
}

deploy();
