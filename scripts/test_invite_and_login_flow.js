const { NodeSSH } = require('node-ssh');

async function testFlow() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const testEmail = 'emp_test_' + Date.now() + '@rfqsa.tech';
  const testPassword = 'TestPassword@2026';

  console.log(`1. Testing invite creation for ${testEmail} with password ${testPassword}...`);

  // We make an authorized invite POST call simulating vendor owner
  const inviteRes = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/team/invite \
    -H "Content-Type: application/json" \
    -H "Cookie: rfq_session=vendor; rfq_role=vendor_owner; rfq_user_id=vendor-demo-id; rfq_user_email=vendor@rfqsa.tech" \
    -d '{"email":"${testEmail}","fullName":"موظف تجريبي جديد","roleId":"vendor_sales_agent","password":"${testPassword}"}'`);

  console.log('Invite Response:\n', inviteRes.stdout);

  console.log('\n2. Testing direct login for the newly invited employee...');
  const loginRes = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"${testEmail}","password":"${testPassword}"}'`);

  console.log('Login Response:\n', loginRes.stdout);

  // Clean up the test employee from the json files
  await ssh.execCommand(`node -e "
    const fs = require('fs');
    const pFile = '/var/www/rfq/data/profiles_db.json';
    const mFile = '/var/www/rfq/data/organization_members_db.json';
    if (fs.existsSync(pFile)) {
      const p = JSON.parse(fs.readFileSync(pFile)).filter(x => x.email !== '${testEmail}');
      fs.writeFileSync(pFile, JSON.stringify(p, null, 2));
    }
    if (fs.existsSync(mFile)) {
      const m = JSON.parse(fs.readFileSync(mFile)).filter(x => x.email !== '${testEmail}');
      fs.writeFileSync(mFile, JSON.stringify(m, null, 2));
    }
    console.log('Cleaned up test employee successfully.');
  "`);

  ssh.dispose();
}

testFlow().catch(console.error);
