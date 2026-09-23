const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Sending assign-role for vendor-demo-id -> vendor_sales_agent:');
  const res = await ssh.execCommand('curl -s -X POST http://127.0.0.1:3002/api/v1/admin/assign-role -H "Content-Type: application/json" -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" -d "{\\"userId\\":\\"vendor-demo-id\\",\\"roleId\\":\\"vendor_sales_agent\\"}"');
  console.log('Response:', res.stdout);

  console.log('\nChecking vendor in profiles_db.json and organization_members_db.json:');
  const check = await ssh.execCommand(`node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('/var/www/rfq/data/profiles_db.json'));
    const vendor = p.find(x => x.id === 'vendor-demo-id');
    console.log('VENDOR PROFILE:', vendor);
    const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
    console.log('VENDOR MEMBERS:', m.filter(x => x.user_id === 'vendor-demo-id'));
    const o = JSON.parse(fs.readFileSync('/var/www/rfq/data/organizations_db.json'));
    console.log('ORGANIZATIONS:', o);
  "`);
  console.log(check.stdout);

  ssh.dispose();
}

main().catch(console.error);
