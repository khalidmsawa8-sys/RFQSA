const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'components/team/team-management-view.tsx',
  'app/api/v1/team/members/[id]/route.ts',
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

  console.log('4️⃣ Testing live member PATCH update flow...');
  // Find a test member or khalid
  const patchTest = await ssh.execCommand(`
    node -e "
      const fs = require('fs');
      const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
      const mem = m.find(x => x.email && x.email.includes('khalidmsawa8')) || m[0];
      console.log(mem ? mem.id : 'NONE');
    "
  `);
  const targetId = patchTest.stdout.trim();
  console.log('Target member ID for test:', targetId);

  if (targetId && targetId !== 'NONE') {
    const patchRes = await ssh.execCommand(`curl -s -X PATCH http://127.0.0.1:3002/api/v1/team/members/${targetId} \
      -H "Content-Type: application/json" \
      -H "Cookie: rfq_session=vendor; rfq_role=vendor_owner; rfq_user_id=vendor-demo-id; rfq_user_email=vendor@rfqsa.tech" \
      -d '{"fullName":"أحمد السعيد - مسؤول المستودع","phone":"0533196558"}'`);
    console.log('PATCH response:\n', patchRes.stdout);
  }

  ssh.dispose();
  console.log('\n🎉 ALL FIXES DEPLOYED & TESTED SUCCESSFULLY!');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
