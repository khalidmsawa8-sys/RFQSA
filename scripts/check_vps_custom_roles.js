const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const getCmd = 'curl -s http://127.0.0.1:3002/api/v1/admin/roles -H "Cookie: rfq_session=admin"';
  const getRes = await ssh.execCommand(getCmd);
  const data = JSON.parse(getRes.stdout);
  console.log("Total roles:", data.total);
  data.roles.forEach(r => {
    if (!r.is_system || r.name_ar.includes("مشرف")) {
      console.log(`- Role: ${r.id} | Name: ${r.name_ar} | Scope: ${r.scope} | is_system: ${r.is_system}`);
    }
  });

  ssh.dispose();
}

check();
