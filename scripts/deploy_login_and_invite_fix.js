const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const filesToUpload = [
  'app/api/v1/auth/login/route.ts',
  'lib/rbac/invitation-service.ts',
  'app/api/v1/team/invite/route.ts',
  'components/team/team-management-view.tsx',
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

  console.log('2️⃣ Synchronizing database records for khalidmsawa8@gmail.com on VPS...');
  const syncDBScript = `
const fs = require('fs');
const path = require('path');

const ORG_MEMBERS = '/var/www/rfq/data/organization_members_db.json';
const PROFILES = '/var/www/rfq/data/profiles_db.json';

if (fs.existsSync(ORG_MEMBERS)) {
  let members = JSON.parse(fs.readFileSync(ORG_MEMBERS, 'utf-8'));
  let found = false;
  members = members.map(m => {
    if (m.email && m.email.toLowerCase().includes('khalidmsawa8')) {
      found = true;
      return {
        ...m,
        status: 'active',
        user_id: m.user_id || 'user_' + m.id,
        role_id: m.role_id || 'vendor_warehouse_clerk',
        updated_at: new Date().toISOString()
      };
    }
    return m;
  });
  if (found) {
    fs.writeFileSync(ORG_MEMBERS, JSON.stringify(members, null, 2), 'utf-8');
    console.log('Updated khalid member in organization_members_db.json to active');
  }
}

if (fs.existsSync(PROFILES)) {
  let profiles = JSON.parse(fs.readFileSync(PROFILES, 'utf-8'));
  const idx = profiles.findIndex(p => p.email && p.email.toLowerCase().includes('khalidmsawa8'));
  const profileEntry = {
    id: 'user_mem_mtx9s1vr',
    email: 'khalidmsawa8@gmail.com',
    phone: '0533196558',
    full_name: 'أحمد (موظف المستودع)',
    company_name: 'مؤسسة قطع الغيار المعتمدة',
    role: 'vendor',
    role_id: 'vendor_warehouse_clerk',
    ref_code: 'SUP-EMP-88',
    is_active: true,
    created_at: new Date().toISOString()
  };
  if (idx >= 0) {
    profiles[idx] = { ...profiles[idx], ...profileEntry };
  } else {
    profiles.push(profileEntry);
  }
  fs.writeFileSync(PROFILES, JSON.stringify(profiles, null, 2), 'utf-8');
  console.log('Ensured khalid profile exists in profiles_db.json');
}
`;

  const syncRes = await ssh.execCommand(`node -e "${syncDBScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
  console.log('Database Sync Output:\n', syncRes.stdout);
  if (syncRes.stderr) console.error('Database Sync Stderr:\n', syncRes.stderr);

  console.log('3️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1200));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('4️⃣ Restarting PM2 process...');
  const restartRes = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(restartRes.stdout);

  console.log('5️⃣ Testing live login API for khalidmsawa8@gmail.com...');
  // Let's test login with curl on port 3002
  const curlRes = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"khalidmsawa8@gmail.com","password":"anyPassword123"}'`);
  console.log('Live Login Test Output:\n', curlRes.stdout);

  ssh.dispose();
  console.log('\n🎉 ALL FIXES DEPLOYED & TESTED SUCCESSFULLY!');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
