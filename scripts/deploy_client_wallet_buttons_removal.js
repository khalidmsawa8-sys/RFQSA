const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/client/wallet/page.tsx',
];

async function deploy() {
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
  console.log('✅ Files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1200));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const restartRes = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(restartRes.stdout);

  console.log('4️⃣ Verifying remote page has no action buttons...');
  const grepDeposit = await ssh.execCommand('grep -n "openActionModal" "/var/www/rfq/app/client/wallet/page.tsx" || true');
  console.log('openActionModal occurrences (should be empty):', grepDeposit.stdout);

  ssh.dispose();
  console.log('🎉 Client wallet deployment finished successfully!');
}

deploy().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
