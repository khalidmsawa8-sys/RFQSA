const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING VENDOR INVOICES & ALL FIXES TO PRODUCTION');
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
        local: path.join(projectRoot, 'app', 'vendor', 'invoices', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/invoices/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'deal', '[orderId]', 'deal-page-client.tsx'),
        remote: '/var/www/rfq/app/deal/[orderId]/deal-page-client.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'courier', 'orders', '[id]', 'page.tsx'),
        remote: '/var/www/rfq/app/courier/orders/[id]/page.tsx',
      },
      {
        local: path.join(projectRoot, 'lib', 'delivery-state-machine.ts'),
        remote: '/var/www/rfq/lib/delivery-state-machine.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'courier-service.ts'),
        remote: '/var/www/rfq/lib/courier-service.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'client', 'orders', '[id]', 'confirm-receipt', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/client/orders/[id]/confirm-receipt/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'orders', '[id]', 'status', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/orders/[id]/status/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'orders', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/orders/route.ts',
      },
      {
        local: path.join(projectRoot, 'components', 'invoice-pdf-export.tsx'),
        remote: '/var/www/rfq/components/invoice-pdf-export.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      if (fs.existsSync(f.local)) {
        console.log(`   Uploading: ${path.relative(projectRoot, f.local)} -> ${f.remote}`);
        await ssh.putFile(f.local, f.remote);
      }
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
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('\n3️⃣ Building Next.js production bundle on server...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 2.5s for Next.js server to become ready...');
    await new Promise((r) => setTimeout(r, 2500));

    console.log('\n5️⃣ Checking PM2 status and health...');
    await execute('pm2 status rfq', 'PM2 STATUS');
    await execute('curl -s -I http://127.0.0.1:3002/vendor/invoices | head -n 5', 'VENDOR INVOICES ROUTE CHECK');

    console.log('\n====================================================');
    console.log('🎉 FIX DEPLOYED AND VERIFIED SUCCESSFULLY!');
    console.log('Live URL: https://rfqsa.tech/vendor/invoices');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ DEPLOYMENT ERROR:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployFix();
