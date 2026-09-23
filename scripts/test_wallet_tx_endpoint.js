const { NodeSSH } = require('node-ssh');

async function testTransactionEndpoint() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- Testing /api/v1/wallet/transaction error handling & auth ---');
  // Invalid amount test to confirm auth passes and validator responds
  const res1 = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/wallet/transaction" \
    -H "Cookie: rfq_session=client" \
    -H "Content-Type: application/json" \
    -d '{"type":"debit","amount":-1}'`);
  console.log('Invalid amount response:', res1.stdout);

  // Check if balance check works when amount exceeds balance
  const res2 = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/wallet/transaction" \
    -H "Cookie: rfq_session=client" \
    -H "Content-Type: application/json" \
    -d '{"type":"debit","amount":99999999}'`);
  console.log('Exceeding balance response:', res2.stdout);

  ssh.dispose();
}

testTransactionEndpoint().catch(console.error);
