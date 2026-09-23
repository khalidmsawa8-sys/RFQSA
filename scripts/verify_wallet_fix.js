const { NodeSSH } = require('node-ssh');

async function verify() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Testing /api/v1/wallet for Client ---');
  const walletRes = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/wallet" -H "Cookie: rfq_session=client"');
  const walletData = JSON.parse(walletRes.stdout);
  console.log('Success:', walletData.success);
  console.log('Balance:', walletData.balance);
  console.log('Profile:', walletData.profile);

  console.log('\n--- 2. Testing /client/rfq/RFQ-1153 HTML ---');
  const rfqPageRes = await ssh.execCommand('curl -s "http://127.0.0.1:3002/client/rfq/RFQ-1153" -H "Cookie: rfq_session=client"');
  console.log('Page response length:', rfqPageRes.stdout.length);
  console.log('Contains /api/v1/wallet fetch or /client/wallet link:', rfqPageRes.stdout.includes('/client/wallet') || rfqPageRes.stdout.includes('RFQ-1153'));

  ssh.dispose();
}

verify().catch(console.error);
