const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });

    const res = await ssh.execCommand('curl -s http://127.0.0.1:3002/deal/ORD-1153 -H "Cookie: rfq_session=client"');
    console.log('--- Verification on Live Server ---');
    console.log('Contains تم التجهيز:', res.stdout.includes('تم التجهيز'));
    console.log('Contains تم الشحن:', res.stdout.includes('تم الشحن'));
    console.log('Contains جاري التسليم:', res.stdout.includes('جاري التسليم'));
    console.log('Contains تأكيد واستلام:', res.stdout.includes('تأكيد واستلام'));
    
    // Also check vendor orders page
    const vendorRes = await ssh.execCommand('curl -s http://127.0.0.1:3002/vendor/orders -H "Cookie: rfq_session=vendor; rfq_role=vendor"');
    console.log('Vendor orders HTTP length:', vendorRes.stdout.length);
    console.log('Vendor contains تم التجهيز:', vendorRes.stdout.includes('تم التجهيز'));
    console.log('Vendor contains تم الشحن:', vendorRes.stdout.includes('تم الشحن'));
    console.log('Vendor contains جاري التسليم:', vendorRes.stdout.includes('جاري التسليم'));
    console.log('Vendor contains تأكيد واستلام:', vendorRes.stdout.includes('تأكيد واستلام'));
  } finally {
    ssh.dispose();
  }
}

test();
