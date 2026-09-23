const { NodeSSH } = require('node-ssh');

async function verify() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const res = await ssh.execCommand('curl -s -i "http://127.0.0.1:3002/admin/orders" -H "Cookie: rfq_session=admin; rfq_role=admin"');
  
  console.log('--- HTTP Response ---');
  console.log(res.stdout.slice(0, 200));

  const hasTimeframe = res.stdout.includes('الإطار الزمني');
  const hasColCustom = res.stdout.includes('تخصيص الأعمدة');
  const hasStatusDropdown = res.stdout.includes('كافة الحالات');
  const hasRfqTab = res.stdout.includes('طلبات عروض الأسعار (RFQs)');

  console.log('\n--- UI Elements Verification in Live Render ---');
  console.log('1. DateRangeFilter (الإطار الزمني):', hasTimeframe);
  console.log('2. Column Customizer (تخصيص الأعمدة):', hasColCustom);
  console.log('3. Status Dropdown (كافة الحالات):', hasStatusDropdown);
  console.log('4. RFQs Tab present:', hasRfqTab);

  ssh.dispose();
}

verify().catch(console.error);
