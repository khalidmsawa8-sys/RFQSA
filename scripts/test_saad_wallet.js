const { NodeSSH } = require('node-ssh');

async function testSaadWallet() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  // Login as Saad
  const loginRes = await ssh.execCommand(`curl -s -i -X POST "http://127.0.0.1:3002/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"saad_1789159340757@innovative-auto.sa","password":"TestSecretPin@2026"}'`);

  console.log('--- Login Response for Saad ---');
  console.log(loginRes.stdout.slice(0, 500));

  // Also check what client.ts or client/wallet page renders
  const walletHtml = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/client/wallet" \
    -H "Cookie: rfq_session=client; rfq_role=client_owner; rfq_user_id=4c6eb3e8-66aa-47b7-88a5-8c846fb6f0a7; rfq_user_email=saad_1789159340757@innovative-auto.sa"`);

  console.log('\n--- Wallet HTML Content snippet ---');
  console.log('Includes 500 balance?', walletHtml.stdout.includes('500'));
  console.log('Includes 0.00?', walletHtml.stdout.includes('0.00') || walletHtml.stdout.includes('0 ر.س'));

  ssh.dispose();
}

testSaadWallet().catch(console.error);
