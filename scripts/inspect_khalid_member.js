const { NodeSSH } = require('node-ssh');

async function inspectMember() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand("node -e \"const fs = require('fs'); const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json')); const found = m.filter(x => x.email && x.email.includes('khalidmsawa8')); console.log(JSON.stringify(found, null, 2));\"");
  console.log(res.stdout);

  ssh.dispose();
}
inspectMember().catch(console.error);
