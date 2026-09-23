const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand(`node -e "
    const fs = require('fs');
    const p = JSON.parse(fs.readFileSync('/var/www/rfq/data/profiles_db.json'));
    const client = p.find(x => x.id === 'client-demo-id');
    const vendor = p.find(x => x.id === 'vendor-demo-id');
    console.log('CLIENT PROFILE:', JSON.stringify(client, null, 2));
    console.log('VENDOR PROFILE:', JSON.stringify(vendor, null, 2));
    const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
    console.log('CLIENT MEMBERS:', JSON.stringify(m.filter(x => x.user_id === 'client-demo-id'), null, 2));
    console.log('VENDOR MEMBERS:', JSON.stringify(m.filter(x => x.user_id === 'vendor-demo-id'), null, 2));
  "`);

  console.log(res.stdout);
  ssh.dispose();
}

main().catch(console.error);
