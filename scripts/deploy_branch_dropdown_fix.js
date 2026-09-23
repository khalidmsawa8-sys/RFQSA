const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployBranchDropdown() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING BRANCH DROPDOWN SELECTOR TO PRODUCTION');
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
    const localFile = path.join(projectRoot, 'app', 'client', 'new-rfq', 'page.tsx');
    const remoteFile = '/var/www/rfq/app/client/new-rfq/page.tsx';

    console.log('2️⃣ Uploading updated app/client/new-rfq/page.tsx to server...');
    await ssh.putFile(localFile, remoteFile);
    console.log('✅ File uploaded successfully!\n');

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

    console.log('5️⃣ Testing live endpoint...');
    const testRes = await execute('curl -s -L http://127.0.0.1:3002/client/new-rfq | grep -o "فروع الشركة المسجلة"', 'Verify Page Content');
    console.log('Verification match:', testRes.stdout.trim());

    console.log('\n🎉 ALL DONE! Deployment finished successfully.');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployBranchDropdown();
