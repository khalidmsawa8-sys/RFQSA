const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('cat /var/www/rfq/data/organization_members_db.json');
  console.log("organization_members_db.json on VPS:");
  console.log(res.stdout || "EMPTY/NOT FOUND: " + res.stderr);

  const res2 = await ssh.execCommand('cat /var/www/rfq/data/profiles_db.json');
  console.log("\nprofiles_db.json length:", res2.stdout.length);

  ssh.dispose();
}

check();
