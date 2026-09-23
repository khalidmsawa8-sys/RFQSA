const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_DEPLOY = [
  'app/vendor/quote/[rfqId]/page.tsx',
  'components/rfq-card-timer.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING QUOTE PAGE CLIENT-SIDE EXCEPTION FIX');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Files:', FILES_TO_DEPLOY);
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (root@147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected successfully!\n');

    const projectRoot = path.join(__dirname, '..');
    const remoteRoot = '/var/www/rfq';

    console.log(`2️⃣ Uploading fixed files to ${remoteRoot}...`);
    for (const relPath of FILES_TO_DEPLOY) {
      const localFile = path.join(projectRoot, relPath);
      const remoteFile = path.posix.join(remoteRoot, relPath.replace(/\\/g, '/'));
      const remoteDir = path.posix.dirname(remoteFile);

      if (!fs.existsSync(localFile)) {
        throw new Error(`Local file not found: ${localFile}`);
      }

      await ssh.execCommand(`mkdir -p "${remoteDir}"`);
      await ssh.putFile(localFile, remoteFile);
      console.log(`  ✓ Uploaded: ${relPath} -> ${remoteFile}`);
    }

    console.log('\n3️⃣ Rebuilding Next.js application on VPS...');
    const buildRes = await ssh.execCommand('npm run build', {
      cwd: remoteRoot,
    });
    console.log(buildRes.stdout);
    if (buildRes.stderr && !buildRes.stderr.includes('warn') && !buildRes.stderr.includes('ExperimentalWarning')) {
      console.log('Build Output Stderr:', buildRes.stderr);
    }

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    const restartRes = await ssh.execCommand('pm2 restart rfq', {
      cwd: remoteRoot,
    });
    console.log(restartRes.stdout);

    // Wait 2 seconds for app to initialize
    await new Promise((r) => setTimeout(r, 2000));

    console.log('\n5️⃣ Verifying Quote Page for RFQ-5940 on VPS (Port 3002)...');
    const curlQuote = await ssh.execCommand(
      'curl -s -i "http://127.0.0.1:3002/vendor/quote/RFQ-5940" -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"'
    );
    console.log('HTTP Status & Headers:');
    console.log(curlQuote.stdout.slice(0, 600));

    const isSuccess = curlQuote.stdout.includes('200 OK');
    const hasDigest = curlQuote.stdout.includes('digest');
    console.log(`\nResult: 200 OK: ${isSuccess}, Has Digest Error: ${hasDigest}`);

    if (isSuccess && !hasDigest) {
      console.log('\n🎉 SUCCESS: Quote page for RFQ-5940 deployed and verified without errors!');
    } else {
      console.error('\n⚠️ WARNING: Check response above.');
    }

    ssh.dispose();
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  }
}

deploy();
