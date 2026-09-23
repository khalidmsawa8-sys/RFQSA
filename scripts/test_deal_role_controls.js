const { NodeSSH } = require('node-ssh');

async function testRoleControls() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Testing Deal Page as Client (cookie rfq_session=client) ---');
  const clientHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/deal/ORD-1153" -H "Cookie: rfq_session=client"');
  console.log('Client page length:', clientHtml.stdout.length);
  // Check if unauthorized button text is present in client HTML
  console.log('Contains "تأكيد تسليم المندوب" in client view?', clientHtml.stdout.includes('تأكيد تسليم المندوب للعميل'));
  console.log('Contains "تأكيد استلام المندوب" in client view?', clientHtml.stdout.includes('تأكيد استلام المندوب (تم الشحن)'));
  console.log('Contains "تأكيد التجهيز (المورد)" in client view?', clientHtml.stdout.includes('تأكيد التجهيز (المورد)'));
  console.log('Contains Client informative status?', clientHtml.stdout.includes('قيد التجهيز من قبل المورد') || clientHtml.stdout.includes('الشحنة في طريقها إليك'));

  console.log('\n--- 2. Testing Deal Page as Vendor (cookie rfq_session=vendor) ---');
  const vendorHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/deal/ORD-1153" -H "Cookie: rfq_session=vendor"');
  console.log('Vendor page length:', vendorHtml.stdout.length);
  console.log('Contains "تأكيد التجهيز (المورد)" for vendor?', vendorHtml.stdout.includes('تأكيد التجهيز (المورد)'));

  console.log('\n--- 3. Testing Deal Page as Courier (cookie rfq_session=courier) ---');
  const courierHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/deal/ORD-1153" -H "Cookie: rfq_session=courier"');
  console.log('Courier page length:', courierHtml.stdout.length);
  console.log('Contains "تأكيد التجهيز (المورد)" for courier?', courierHtml.stdout.includes('تأكيد التجهيز (المورد)'));

  ssh.dispose();
}

testRoleControls().catch(console.error);
