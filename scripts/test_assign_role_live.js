const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Testing assign-role with cookie: rfq_session=admin; rfq_user_id=admin-demo-id');
  const res = await ssh.execCommand('curl -s -X POST http://127.0.0.1:3002/api/v1/admin/assign-role -H "Content-Type: application/json" -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" -d "{\\"userId\\":\\"client-demo-id\\",\\"roleId\\":\\"client_procurement_manager\\"}"');
  console.log('Response:', res.stdout);

  console.log('\nChecking organization_members in DB:');
  const check = await ssh.execCommand('node -e "const fs = require(\'fs\'); if (fs.existsSync(\'/var/www/rfq/data/organization_members_db.json\')) { const d = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/organization_members_db.json\')); console.log(\'members count:\', d.length); console.log(JSON.stringify(d, null, 2)); } else { console.log(\'No organization_members_db.json\'); }"');
  console.log(check.stdout);

  ssh.dispose();
}

test();
