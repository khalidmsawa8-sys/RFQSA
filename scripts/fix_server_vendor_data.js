const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixData() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  // 1. Upload local data/profiles_db.json
  const path = require('path');
  const localProfiles = path.join(__dirname, '..', 'data', 'profiles_db.json');
  console.log('Uploading local profiles_db.json...');
  await ssh.putFile(localProfiles, '/var/www/rfq/data/profiles_db.json');
  console.log('Uploaded profiles_db.json.');

  // 2. Fix organization_members_db.json
  const script = `
    const fs = require('fs');
    const mPath = '/var/www/rfq/data/organization_members_db.json';
    const members = JSON.parse(fs.readFileSync(mPath, 'utf8'));
    for (const m of members) {
      if (m.user_id === 'vendor-demo-id' || m.id === 'mem_mtxh3sx1' || m.email?.includes('vendor')) {
        m.email = 'vendor@rfqsa.tech';
        m.password = '123456';
        m.role_id = 'vendor_owner';
        m.status = 'active';
      }
    }
    fs.writeFileSync(mPath, JSON.stringify(members, null, 2), 'utf8');
    console.log('Fixed members.');
  `;
  await ssh.execCommand(`node -e "${script.replace(/\n/g, ' ')}"`, { cwd: '/var/www/rfq' });

  // 3. Test login
  const test1 = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"vendor@rfqsa.tech","password":"123456"}'`);
  console.log('Login Test with vendor@rfqsa.tech / 123456:');
  console.log(test1.stdout);

  ssh.dispose();
}

fixData().catch(console.error);
