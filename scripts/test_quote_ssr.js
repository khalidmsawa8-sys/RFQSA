const { NodeSSH } = require('node-ssh');

async function testQuotePage() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const res = await ssh.execCommand('curl -s -i "http://127.0.0.1:3002/vendor/quote/RFQ-5940" -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"');
  console.log('--- RESPONSE HEADERS ---');
  console.log(res.stdout.slice(0, 500));
  
  // Check if HTML contains any error digest or page content
  const hasError = res.stdout.includes('digest');
  console.log('Has digest in HTML?', hasError);
  if (hasError) {
    console.log(res.stdout.slice(500, 2000));
  }

  ssh.dispose();
}

testQuotePage().catch(console.error);
