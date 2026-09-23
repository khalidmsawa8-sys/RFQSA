const { NodeSSH } = require('node-ssh');

async function clean() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const remoteScript = `
const fs = require('fs');
const p = '/var/www/rfq/data/profiles_db.json';
const d = JSON.parse(fs.readFileSync(p, 'utf-8')).filter(x => !x.email || !x.email.includes('test.staff'));
fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8');

const m = '/var/www/rfq/data/organization_members_db.json';
const md = JSON.parse(fs.readFileSync(m, 'utf-8')).filter(x => !x.email || !x.email.includes('test.staff'));
fs.writeFileSync(m, JSON.stringify(md, null, 2), 'utf-8');

console.log('Cleanup complete. Remaining profiles:', d.length, 'members:', md.length);
`;

  await ssh.execCommand(`cat << 'EOF' > /tmp/clean_test.js\n${remoteScript}\nEOF`);
  const res = await ssh.execCommand('node /tmp/clean_test.js');
  console.log(res.stdout);
  ssh.dispose();
}

clean().catch(console.error);
