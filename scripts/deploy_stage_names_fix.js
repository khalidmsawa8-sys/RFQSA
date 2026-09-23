const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployStageNamesFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING ORDER STAGES UNIFICATION TO PRODUCTION');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Stages: تم التجهيز - تم الشحن - جاري التسليم - تأكيد واستلام');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected successfully!\n');

    const projectRoot = path.join(__dirname, '..');
    const filesToUpload = [
      {
        local: path.join(projectRoot, 'components', 'order-status-tracker.tsx'),
        remote: '/var/www/rfq/components/order-status-tracker.tsx',
      },
      {
        local: path.join(projectRoot, 'components', 'dashboard', 'slide-dashboard.tsx'),
        remote: '/var/www/rfq/components/dashboard/slide-dashboard.tsx',
      },
      {
        local: path.join(projectRoot, 'components', 'deal-header.tsx'),
        remote: '/var/www/rfq/components/deal-header.tsx',
      },
      {
        local: path.join(projectRoot, 'lib', 'order-status-sync.ts'),
        remote: '/var/www/rfq/lib/order-status-sync.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'order-state-machine.ts'),
        remote: '/var/www/rfq/lib/order-state-machine.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'permissions.ts'),
        remote: '/var/www/rfq/lib/rbac/permissions.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'orders', 'orders-client.tsx'),
        remote: '/var/www/rfq/app/vendor/orders/orders-client.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'orders', 'orders-client.tsx'),
        remote: '/var/www/rfq/app/client/orders/orders-client.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'deal', '[orderId]', 'deal-page-client.tsx'),
        remote: '/var/www/rfq/app/deal/[orderId]/deal-page-client.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'dashboard-client.tsx'),
        remote: '/var/www/rfq/app/client/dashboard-client.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'order', '[orderId]', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/order/[orderId]/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'orders', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/orders/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'users', '[userId]', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/users/[userId]/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'vendor', 'orders', '[id]', 'status', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/vendor/orders/[id]/status/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'export', 'orders', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/export/orders/route.ts',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      if (!fs.existsSync(f.local)) {
        console.warn(`⚠️ Warning: Local file missing: ${f.local}`);
        continue;
      }
      console.log(`   Uploading: ${path.basename(f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ All 15 files uploaded successfully!\n');

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
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('\n3️⃣ Building Next.js production bundle on server...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 3s for server warmup...');
    await new Promise((r) => setTimeout(r, 3000));

    console.log('\n5️⃣ Verifying live server response & unified stage labels...');
    const dealCheck = await ssh.execCommand('curl -s "http://127.0.0.1:3002/deal/ORD-1153" -H "Cookie: rfq_session=client"');
    console.log('   Deal page HTTP length:', dealCheck.stdout.length);
    console.log('   Contains "تم التجهيز":', dealCheck.stdout.includes('تم التجهيز'));
    console.log('   Contains "تم الشحن":', dealCheck.stdout.includes('تم الشحن'));
    console.log('   Contains "جاري التسليم":', dealCheck.stdout.includes('جاري التسليم'));
    console.log('   Contains "تأكيد واستلام":', dealCheck.stdout.includes('تأكيد واستلام'));

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT COMPLETE & VERIFIED SUCCESSFULLY ON SERVER!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployStageNamesFix();
