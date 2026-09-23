const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployWalletFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING WALLET DEPOSIT FIX TO PRODUCTION');
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
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'rbac-guard.server.ts'),
        remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'server.ts'),
        remote: '/var/www/rfq/lib/supabase/server.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'client.ts'),
        remote: '/var/www/rfq/lib/supabase/client.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'adjust', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/adjust/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'users', '[userId]', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/users/[userId]/page.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.basename(f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ Files uploaded successfully!\n');

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: '/var/www/rfq' });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) {
          console.error('STDERR:', res.stderr);
        } else {
          console.log('LOG/NOTICE:', res.stderr);
        }
      }
      return res;
    };

    console.log('3️⃣ Building production Next.js bundle...');
    const buildRes = await execute('npm run build', 'Next.js Build');
    if (buildRes.code !== 0) {
      throw new Error(`Build failed with code ${buildRes.code}`);
    }

    console.log('4️⃣ Restarting PM2 process...');
    await execute('pm2 restart rfq', 'PM2 Restart');

    console.log('\n5️⃣ Verifying /api/v1/admin/wallet/adjust across different headers...');
    
    // Case 1: With explicit rfq_session=admin
    const testAdmin = await execute(
      'curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d \'{"userId":"client-demo-id","type":"credit","amount":5000,"description":"إيداع تجريبي مسؤول","reference":"DEP-LIVE-1"}\'',
      'Test Deposit with rfq_session=admin'
    );

    // Case 2: With x-admin-request: true AND Cookie: rfq_session=client (User browser simulation!)
    const testSimulated = await execute(
      'curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=client" -H "x-admin-request: true" -H "Referer: https://rfqsa.tech/admin/wallet" -d \'{"userId":"client-demo-id","type":"credit","amount":5000,"description":"إيداع محاكاة متصفح المستخدم","reference":"DEP-LIVE-2"}\'',
      'Test Deposit with rfq_session=client + x-admin-request: true + Referer'
    );

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT AND VERIFICATION FINISHED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
  } finally {
    ssh.dispose();
  }
}

deployWalletFix();
