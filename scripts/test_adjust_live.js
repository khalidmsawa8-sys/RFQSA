const { NodeSSH } = require('node-ssh');

async function testAdjust() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const payload = {
    userId: "4c6eb3e8-66aa-47b7-88a5-8c846fb6f0a7", // Saad
    type: "credit",
    amount: 500,
    description: "إيداع تجريبي من الإدارة",
  };

  const res = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" \
    -H "Content-Type: application/json" \
    -H "Cookie: rfq_session=admin; rfq_role=admin" \
    -H "x-admin-request: true" \
    -d '${JSON.stringify(payload)}'`);

  console.log('Adjust result:\n', res.stdout);

  ssh.dispose();
}

testAdjust().catch(console.error);
