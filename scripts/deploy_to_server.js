const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 STARTING DEPLOYMENT TO PRODUCTION SERVER');
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

    const localArchive = path.join(__dirname, '..', 'deploy.tar.gz');
    const remoteArchive = '/var/www/rfq/deploy.tar.gz';

    console.log(`2️⃣ Uploading ${localArchive} -> ${remoteArchive}...`);
    const startTime = Date.now();
    await ssh.putFile(localArchive, remoteArchive);
    console.log(`✅ Upload complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s!\n`);

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

    console.log('3️⃣ Extracting archive on server...');
    await execute('tar -xzf deploy.tar.gz', 'EXTRACT ARCHIVE');

    console.log('\n4️⃣ Installing / Updating dependencies on server...');
    await execute('npm install --production=false', 'NPM INSTALL');

    console.log('\n5️⃣ Building Next.js production bundle...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n6️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq || pm2 start npm --name "rfq" -- start -- -p 3002', 'PM2 RESTART');

    console.log('\n7️⃣ Verifying deployment status...');
    await execute('pm2 status', 'PM2 STATUS');
    await execute('curl -s -I http://127.0.0.1:3002 | head -n 10', 'LOCAL HEALTH CHECK (Port 3002)');
    await execute('curl -s -I https://rfqsa.tech | head -n 10', 'PUBLIC SSL DOMAIN CHECK (rfqsa.tech)');

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log('Live URL: https://rfqsa.tech');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
