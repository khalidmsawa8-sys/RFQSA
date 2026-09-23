const { NodeSSH } = require('node-ssh');

async function testLiveLogin() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Testing login endpoint via curl...');
  const res = await ssh.execCommand(
    'curl -i -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"khalidmsawa8@gmail.com","password":"anyPassword123"}\''
  );
  console.log('HTTP Response:\n', res.stdout);

  console.log('\nChecking khalid in profiles_db.json:');
  const prof = await ssh.execCommand('node -e "const fs = require(\'fs\'); const p = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/profiles_db.json\')); console.log(p.find(x => x.email && x.email.includes(\'khalidmsawa8\')));"');
  console.log(prof.stdout);

  console.log('\nChecking khalid in organization_members_db.json:');
  const mem = await ssh.execCommand('node -e "const fs = require(\'fs\'); const m = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/organization_members_db.json\')); console.log(m.find(x => x.email && x.email.includes(\'khalidmsawa8\')));"');
  console.log(mem.stdout);

  ssh.dispose();
}

testLiveLogin().catch(console.error);
