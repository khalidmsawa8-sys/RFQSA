const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployUnifyWallet() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING UNIFIED WALLET & INVOICE FORMATS TO PRODUCTION');
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
        local: path.join(projectRoot, 'lib', 'invoice-canonical.ts'),
        remote: '/var/www/rfq/lib/invoice-canonical.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'wallet', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/wallet/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'courier', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/courier/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/wallet/page.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      if (fs.existsSync(f.local)) {
        console.log(`   Uploading: ${path.relative(projectRoot, f.local)} -> ${f.remote}`);
        await ssh.putFile(f.local, f.remote);
      } else {
        console.warn(`   ⚠️ File missing locally: ${f.local}`);
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

    console.log('⏳ Waiting 3s for Next.js server to become ready...');
    await new Promise((r) => setTimeout(r, 3000));

    console.log('\n5️⃣ Checking PM2 status and health...');
    await execute('pm2 status rfq', 'PM2 STATUS');
    await execute('curl -s -I http://127.0.0.1:3002/vendor/wallet | head -n 5', 'VENDOR WALLET ROUTE CHECK');
    await execute('curl -s -I http://127.0.0.1:3002/courier/wallet | head -n 5', 'COURIER WALLET ROUTE CHECK');
    await execute('curl -s -I http://127.0.0.1:3002/admin/wallet | head -n 5', 'ADMIN WALLET ROUTE CHECK');

    console.log('\n====================================================');
    console.log('🎉 UNIFIED WALLET & INVOICE FORMATS DEPLOYED SUCCESSFULLY!');
    console.log('Live URLs:');
    console.log(' - Client Wallet: https://rfqsa.tech/client/wallet');
    console.log(' - Vendor Wallet: https://rfqsa.tech/vendor/wallet');
    console.log(' - Courier Wallet: https://rfqsa.tech/courier/wallet');
    console.log(' - Admin Wallet: https://rfqsa.tech/admin/wallet');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ DEPLOYMENT ERROR:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployUnifyWallet();
