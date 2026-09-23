const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function clean() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log("Connected to server...");

  // Delete test role
  const delRoleRes = await ssh.execCommand('curl -s -X DELETE http://127.0.0.1:3002/api/v1/admin/roles/client_custom_mtoum0l7 -H "Cookie: rfq_session=admin"');
  console.log("Delete test role:", delRoleRes.stdout || delRoleRes.stderr);

  // Clean test user phone 0533196489 from profiles_db.json
  const cleanCmd = `node -e "
    const fs = require('fs');
    const file = '/var/www/rfq/data/profiles_db.json';
    if (fs.existsSync(file)) {
      const d = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const f = d.filter(u => u.phone !== '0533196489');
      fs.writeFileSync(file, JSON.stringify(f, null, 2), 'utf-8');
      console.log('Profiles updated, remaining count:', f.length);
    }
  "`;
  const cleanRes = await ssh.execCommand(cleanCmd);
  console.log(cleanRes.stdout || cleanRes.stderr);

  ssh.dispose();
}

clean();
