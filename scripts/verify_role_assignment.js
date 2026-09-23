const { NodeSSH } = require('node-ssh');

async function verify() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('=== TEST 1: Assign role vendor_sales_agent to vendor-demo-id ===');
  const assignVendor = await ssh.execCommand(
    'curl -s -X POST http://127.0.0.1:3002/api/v1/admin/assign-role -H "Content-Type: application/json" -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" -d "{\\"userId\\":\\"vendor-demo-id\\",\\"roleId\\":\\"vendor_sales_agent\\"}"'
  );
  console.log('Assign Vendor Response:', assignVendor.stdout);

  console.log('\n=== TEST 2: Check GET /api/v1/admin/users/vendor-demo-id ===');
  const getVendor = await ssh.execCommand(
    'curl -s http://127.0.0.1:3002/api/v1/admin/users/vendor-demo-id -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"'
  );
  const vendorData = JSON.parse(getVendor.stdout);
  console.log('Vendor User Details Role:', vendorData.role);
  if (vendorData.role === 'vendor_sales_agent') {
    console.log('✅ SUCCESS: vendor-demo-id role updated to vendor_sales_agent!');
  } else {
    console.error('❌ FAIL: Expected vendor_sales_agent, got:', vendorData.role);
  }

  console.log('\n=== TEST 3: Assign role client_procurement_manager to client-demo-id ===');
  const assignClient = await ssh.execCommand(
    'curl -s -X POST http://127.0.0.1:3002/api/v1/admin/assign-role -H "Content-Type: application/json" -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" -d "{\\"userId\\":\\"client-demo-id\\",\\"roleId\\":\\"client_procurement_manager\\"}"'
  );
  console.log('Assign Client Response:', assignClient.stdout);

  console.log('\n=== TEST 4: Check GET /api/v1/admin/users/client-demo-id ===');
  const getClient = await ssh.execCommand(
    'curl -s http://127.0.0.1:3002/api/v1/admin/users/client-demo-id -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"'
  );
  const clientData = JSON.parse(getClient.stdout);
  console.log('Client User Details Role:', clientData.role);
  if (clientData.role === 'client_procurement_manager') {
    console.log('✅ SUCCESS: client-demo-id role updated to client_procurement_manager!');
  } else {
    console.error('❌ FAIL: Expected client_procurement_manager, got:', clientData.role);
  }

  console.log('\n=== TEST 5: Check GET /api/v1/admin/roles?includeMembers=true ===');
  const getRolesMembers = await ssh.execCommand(
    'curl -s "http://127.0.0.1:3002/api/v1/admin/roles?includeMembers=true" -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"'
  );
  const rmData = JSON.parse(getRolesMembers.stdout);
  const vUser = rmData.users?.find(u => u.id === 'vendor-demo-id');
  const cUser = rmData.users?.find(u => u.id === 'client-demo-id');
  console.log('Vendor in Roles Members:', vUser?.full_name, '-> Role:', vUser?.current_role_id);
  console.log('Client in Roles Members:', cUser?.full_name, '-> Role:', cUser?.current_role_id);

  if (vUser?.current_role_id === 'vendor_sales_agent' && cUser?.current_role_id === 'client_procurement_manager') {
    console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ Verification check failed.');
  }

  ssh.dispose();
}

verify().catch(console.error);
