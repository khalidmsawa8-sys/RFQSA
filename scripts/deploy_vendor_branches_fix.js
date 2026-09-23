const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployVendorBranchesFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING VENDOR BRANCHES & PHONE REMOVAL FIX');
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
        local: path.join(projectRoot, 'data', 'vendor_branches_db.json'),
        remote: '/var/www/rfq/data/vendor_branches_db.json',
      },
      {
        local: path.join(projectRoot, 'lib', 'vendor-branches.ts'),
        remote: '/var/www/rfq/lib/vendor-branches.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'vendor', 'branches', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/vendor/branches/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'new-rfq', 'page.tsx'),
        remote: '/var/www/rfq/app/client/new-rfq/page.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.basename(f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ All files uploaded successfully!\n');

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

    console.log('3️⃣ Building Next.js application on VPS...');
    const buildRes = await execute('npm run build', 'Next.js Build');
    if (buildRes.code !== 0) {
      console.error('❌ Build failed on server!');
      process.exit(1);
    }

    console.log('4️⃣ Restarting PM2 process...');
    await execute('pm2 restart rfq', 'PM2 Restart');

    console.log('5️⃣ Testing branch API directly on VPS...');
    const apiTest = await execute('curl -s "http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=v-supplier-1"', 'API Test v-supplier-1');
    console.log('API Response:', apiTest.stdout.substring(0, 300));

    console.log('\n🎉 ALL DONE! Deployment finished successfully.');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployVendorBranchesFix();
