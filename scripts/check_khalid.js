const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res1 = await ssh.execCommand("grep -i 'khalid' /var/www/rfq/data/profiles_db.json");
  console.log('grep in profiles_db.json:\n', res1.stdout);

  const res2 = await ssh.execCommand("grep -i 'khalid' /var/www/rfq/data/organization_members_db.json");
  console.log('grep in organization_members_db.json:\n', res2.stdout);

  // Also print the last 3 records of both files
  const res3 = await ssh.execCommand("node -e \"const fs = require('fs'); const p = JSON.parse(fs.readFileSync('/var/www/rfq/data/profiles_db.json')); console.log('Last 3 profiles:', p.slice(-3)); const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json')); console.log('Last 3 members:', m.slice(-3));\"");
  console.log(res3.stdout);

  ssh.dispose();
}
check().catch(console.error);
