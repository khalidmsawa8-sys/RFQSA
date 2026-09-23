const { NodeSSH } = require('node-ssh');

async function testInvite() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Testing invite with password on live server...');

  const testPayload = JSON.stringify({
    email: 'test.staff.' + Date.now() + '@example.com',
    fullName: 'موظف تجريبي جديد',
    phone: '0599988776',
    roleId: 'vendor_sales_agent',
    password: 'TestSecretPin@2026',
  });

  const curlCmd = `curl -s -X POST -H "Content-Type: application/json" -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id" -d '${testPayload}' http://127.0.0.1:3002/api/v1/team/invite`;

  const res = await ssh.execCommand(curlCmd);
  console.log('API Response:', res.stdout);

  const data = JSON.parse(res.stdout);
  console.log('Success:', data.success);
  console.log('Invite URL generated:', data.invitationUrl);
  console.log('Password returned:', data.password);

  // Check login with newly created credentials
  const loginPayload = JSON.stringify({
    identifier: JSON.parse(testPayload).email,
    password: 'TestSecretPin@2026',
  });
  const loginCmd = `curl -s -X POST -H "Content-Type: application/json" -d '${loginPayload}' http://127.0.0.1:3002/api/v1/auth/login`;
  const loginRes = await ssh.execCommand(loginCmd);
  console.log('\nLogin Test with created password:');
  console.log(loginRes.stdout);
  const loginData = JSON.parse(loginRes.stdout);
  console.log('Login Success:', loginData.success);
  console.log('Logged in user role:', loginData.user?.role, 'roleId:', loginData.user?.roleId);

  ssh.dispose();
}

testInvite().catch(console.error);
