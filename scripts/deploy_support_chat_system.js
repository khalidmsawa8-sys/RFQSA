const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'components/support/client-ticket-conversation.tsx',
  'app/vendor/support/[id]/page.tsx',
  'app/client/support/[id]/page.tsx',
  'app/courier/support/[id]/page.tsx',
  'app/admin/(dashboard)/support/[id]/page.tsx',
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
  console.log('Build Output:\n', buildRes.stdout.slice(-1000));
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

  // Wait 2 seconds
  await new Promise((r) => setTimeout(r, 2000));

  console.log('4️⃣ Testing chat message endpoint on live server...');
  const checkRes = await ssh.execCommand(
    'curl -s http://127.0.0.1:3002/api/v1/support/TKT-4574/messages'
  );
  console.log('Live messages response:', checkRes.stdout.slice(0, 300));

  console.log('\n🎉 ALL SUPPORT CHAT ENHANCEMENTS DEPLOYED SUCCESSFULLY!');
  ssh.dispose();
}

deployAndVerify().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
