const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const clientRes = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/team/roles?scope=client"');
  const clientData = JSON.parse(clientRes.stdout);
  console.log("Client Roles count:", clientData.total);
  clientData.roles.forEach(r => console.log(`  - [Client] ${r.name_ar} (${r.id}) - is_system: ${r.is_system}`));

  const vendorRes = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/team/roles?scope=vendor"');
  const vendorData = JSON.parse(vendorRes.stdout);
  console.log("\nVendor Roles count:", vendorData.total);
  vendorData.roles.forEach(r => console.log(`  - [Vendor] ${r.name_ar} (${r.id}) - is_system: ${r.is_system}`));

  ssh.dispose();
}

check();
