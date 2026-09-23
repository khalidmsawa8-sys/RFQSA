const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testInvite() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const payload = JSON.stringify({
    email: 'test_inv_' + Date.now() + '@example.com',
    fullName: 'موظف تجريبي',
    phone: '0501234567',
    roleId: 'client_procurement_manager',
  });

  console.log('1. Testing with rfq_session=client:');
  const res1 = await ssh.execCommand(
    `curl -s -X POST "http://127.0.0.1:3002/api/v1/team/invite" -H "Content-Type: application/json" -H "Cookie: rfq_session=client" -d '${payload}'`
  );
  console.log('Output 1:', res1.stdout || res1.stderr);

  console.log('\n2. Testing with rfq_session=admin:');
  const res2 = await ssh.execCommand(
    `curl -s -X POST "http://127.0.0.1:3002/api/v1/team/invite" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d '${payload}'`
  );
  console.log('Output 2:', res2.stdout || res2.stderr);

  ssh.dispose();
}

testInvite().catch(console.error);
