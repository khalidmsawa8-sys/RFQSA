const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testApi() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log("Connected to VPS...");

  // 1. Clean up our test role
  const delCmd = 'curl -s -X DELETE http://127.0.0.1:3002/api/v1/admin/roles/client_custom_mtoudniy -H "Cookie: rfq_session=admin"';
  const delRes = await ssh.execCommand(delCmd);
  console.log("DELETE test role response:", delRes.stdout || delRes.stderr);

  // 2. Fetch roles list again to verify
  const getCmd = 'curl -s http://127.0.0.1:3002/api/v1/admin/roles -H "Cookie: rfq_session=admin"';
  const getRes = await ssh.execCommand(getCmd);
  try {
    const data = JSON.parse(getRes.stdout);
    console.log("Success:", data.success, "Total roles after cleanup:", data.total);
    const found = data.roles.find(r => r.id === "client_custom_mtoudniy");
    console.log("Is test role deleted?", found ? "No" : "Yes, successfully removed");
  } catch (e) {
    console.log(getRes.stdout.slice(0, 300));
  }

  ssh.dispose();
}

testApi();
