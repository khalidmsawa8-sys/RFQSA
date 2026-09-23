const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testPage() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });
    const res = await ssh.execCommand('curl -s -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id" http://127.0.0.1:3002/vendor/invoices');
    console.log('Page Length:', res.stdout.length);
    console.log('Includes title:', res.stdout.includes('سجل فواتير المبيعات الضريبية'));
    console.log('Includes table/headers:', res.stdout.includes('رقم الفاتورة'));
  } finally {
    ssh.dispose();
  }
}

testPage();
