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
    console.log('--- CREATED_AT VALUES ---');
    console.table(p.map(x => ({ id: x.id, full_name: x.full_name, created_at: x.created_at })));
  "`);
  console.log(res.stdout);

  ssh.dispose();
}

main().catch(console.error);
