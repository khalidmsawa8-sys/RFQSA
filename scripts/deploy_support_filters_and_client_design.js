const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/vendor/support/vendor-support-client.tsx',
  'app/client/support/page.tsx',
  'app/client/support/support-client.tsx',
];

async function deployAndVerify() {
  const ssh = new NodeSSH();
  console.log('1️⃣ Connecting to VPS 147.93.56.252...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });
  console.log('✅ SSH Connected!\n');

  const localBase = path.join(__dirname, '..');
  const remoteBase = '/var/www/rfq';

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}...`);
    await ssh.putFile(localPath, remotePath);
  }
  console.log('✅ All files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1500));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(pm2Res.stdout);
  console.log('✅ PM2 Restarted.\n');

  // Wait 3 seconds for service to settle
  await new Promise((r) => setTimeout(r, 3000));

  console.log('4️⃣ Testing endpoints on live server...');
  const testVendor = await ssh.execCommand(
    'curl -s -o /dev/null -w "%{http_code}" -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id" http://127.0.0.1:3002/vendor/support'
  );
  console.log('Vendor support page HTTP status:', testVendor.stdout.trim());

  const testClient = await ssh.execCommand(
    'curl -s -o /dev/null -w "%{http_code}" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id" http://127.0.0.1:3002/client/support'
  );
  console.log('Client support page HTTP status:', testClient.stdout.trim());

  // Check HTML content of client support page to ensure matching title
  const htmlClient = await ssh.execCommand(
    'curl -s -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id" http://127.0.0.1:3002/client/support'
  );
  const containsClientTitle = htmlClient.stdout.includes('مركز الدعم والمساعدة للعملاء');
  console.log('Client page contains "مركز الدعم والمساعدة للعملاء":', containsClientTitle);

  // Check HTML content of vendor support page
  const htmlVendor = await ssh.execCommand(
    'curl -s -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id" http://127.0.0.1:3002/vendor/support'
  );
  const containsVendorTitle = htmlVendor.stdout.includes('مركز الدعم والمساعدة للموردين');
  console.log('Vendor page contains "مركز الدعم والمساعدة للموردين":', containsVendorTitle);

  ssh.dispose();
  console.log('🎉 Deployment and Verification Completed!');
}

deployAndVerify().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
