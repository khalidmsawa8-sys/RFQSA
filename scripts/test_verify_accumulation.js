const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const res = await ssh.execCommand('curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d \'{"userId":"client-demo-id","type":"credit","amount":2500,"description":"إيداع رصيد إضافي","reference":"DEP-TEST-2500"}\'');
  console.log('OUTPUT:', res.stdout);
  ssh.dispose();
}

run().catch(console.error);
