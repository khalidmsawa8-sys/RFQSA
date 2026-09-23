const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const res = await ssh.execCommand('curl -s -i "http://127.0.0.1:3002/api/v1/admin/wallet" -H "Cookie: rfq_session=admin" -H "x-admin-request: true"');
  console.log(res.stdout);
  ssh.dispose();
}

run().catch(console.error);
