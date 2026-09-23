const { NodeSSH } = require('node-ssh');

async function testRender() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Testing /admin/users page response on VPS...');
  const res = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' http://127.0.0.1:3002/admin/users");
  
  console.log('HTTP Status / Content check:');
  console.log('Has "إدارة المستخدمين":', res.stdout.includes('إدارة المستخدمين'));
  console.log('Has "فريق المنصة":', res.stdout.includes('فريق المنصة'));
  console.log('Has "إدارة المنصة":', res.stdout.includes('إدارة المنصة'));

  // Also test /api/v1/admin/users with role=admin
  const adminRes = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' 'http://127.0.0.1:3002/api/v1/admin/users?role=admin'");
  const adminData = JSON.parse(adminRes.stdout);
  console.log('\nFilter by role=admin API test:');
  console.log('Count:', adminData.total);
  console.log('Admin user found:', adminData.users?.[0]?.full_name, '| Role:', adminData.users?.[0]?.role, '| Ref Code:', adminData.users?.[0]?.ref_code);

  // Test /api/v1/admin/users with role=vendor
  const vendorRes = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' 'http://127.0.0.1:3002/api/v1/admin/users?role=vendor'");
  const vendorData = JSON.parse(vendorRes.stdout);
  console.log('\nFilter by role=vendor API test:');
  console.log('Count:', vendorData.total);

  // Test /api/v1/admin/users with role=courier
  const courierRes = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' 'http://127.0.0.1:3002/api/v1/admin/users?role=courier'");
  const courierData = JSON.parse(courierRes.stdout);
  console.log('\nFilter by role=courier API test:');
  console.log('Count:', courierData.total);

  // Test /api/v1/admin/users with role=client
  const clientRes = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' 'http://127.0.0.1:3002/api/v1/admin/users?role=client'");
  const clientData = JSON.parse(clientRes.stdout);
  console.log('\nFilter by role=client API test:');
  console.log('Count:', clientData.total);

  ssh.dispose();
}

testRender().catch(console.error);
