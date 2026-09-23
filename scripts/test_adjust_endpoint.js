const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testAdjust() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const resWithAdmin = await ssh.execCommand('curl -s -i -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d "{\\"userId\\":\\"client-demo-id\\",\\"type\\":\\"credit\\",\\"amount\\":5000,\\"description\\":\\"إيداع تجريبي\\",\\"reference\\":\\"INV-10023\\"}"');
  console.log('--- WITH rfq_session=admin ---');
  console.log(resWithAdmin.stdout);

  const resWithout = await ssh.execCommand('curl -s -i -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -d "{\\"userId\\":\\"client-demo-id\\",\\"type\\":\\"credit\\",\\"amount\\":5000,\\"description\\":\\"إيداع تجريبي\\",\\"reference\\":\\"INV-10023\\"}"');
  console.log('--- WITHOUT COOKIE ---');
  console.log(resWithout.stdout);

  const resWithClient = await ssh.execCommand('curl -s -i -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=client" -d "{\\"userId\\":\\"client-demo-id\\",\\"type\\":\\"credit\\",\\"amount\\":5000,\\"description\\":\\"إيداع تجريبي\\",\\"reference\\":\\"INV-10023\\"}"');
  console.log('--- WITH rfq_session=client ---');
  console.log(resWithClient.stdout);

  process.exit(0);
}
testAdjust().catch(console.error);
