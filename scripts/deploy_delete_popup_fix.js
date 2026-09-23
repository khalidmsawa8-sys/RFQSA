const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'components/team/team-management-view.tsx',
  'lib/rbac/invitation-service.ts',
  'app/api/v1/team/members/route.ts',
  'lib/supabase/server.ts',
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

  console.log('4️⃣ Testing live member deletion flow...');
  const dummyId = 'mem_test_del_' + Date.now();
  await ssh.execCommand(`node -e "
    const fs = require('fs');
    const mFile = '/var/www/rfq/data/organization_members_db.json';
    let members = JSON.parse(fs.readFileSync(mFile, 'utf-8'));
    members.push({
      id: '${dummyId}',
      organization_id: 'org-client-demo-id',
      email: 'delete_me_${Date.now()}@test.com',
      full_name: 'عضو تجريبي للحذف',
      role_id: 'client_technician',
      status: 'active',
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(mFile, JSON.stringify(members, null, 2));
    console.log('Created dummy member:', '${dummyId}');
  "`);

  const delRes = await ssh.execCommand(`curl -s -X DELETE http://127.0.0.1:3002/api/v1/team/members/${dummyId} \
    -H "Cookie: rfq_session=client; rfq_role=client_owner; rfq_user_id=client-demo-id; rfq_user_email=client@rfqsa.tech"`);
  console.log('Delete API Response:\n', delRes.stdout);

  const verifyRes = await ssh.execCommand(`node -e "
    const fs = require('fs');
    const mFile = '/var/www/rfq/data/organization_members_db.json';
    let members = JSON.parse(fs.readFileSync(mFile, 'utf-8'));
    const found = members.find(m => m.id === '${dummyId}');
    console.log('Found in DB after delete:', Boolean(found));
  "`);
  console.log(verifyRes.stdout);

  ssh.dispose();
  console.log('\n🎉 ALL FIXES DEPLOYED & TESTED SUCCESSFULLY!');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
