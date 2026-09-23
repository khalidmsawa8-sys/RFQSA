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
    console.log('--- ALL PROFILES ID, ROLE, IS_ADMIN, FULL_NAME ---');
    console.table(p.map(x => ({ id: x.id, role: x.role, is_admin: x.is_admin, admin_role: x.admin_role, role_id: x.role_id, full_name: x.full_name })));
  "`);
  console.log(res.stdout);

  ssh.dispose();
}

main().catch(console.error);
