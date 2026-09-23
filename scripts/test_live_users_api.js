const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=admin; rfq_user_id=admin-demo-id' http://127.0.0.1:3002/api/v1/admin/users");
  try {
    const data = JSON.parse(res.stdout);
    console.log('API Response Success:', data.success);
    console.log('Total Users:', data.total);
    
    const adminUser = data.users?.find(u => u.id === 'admin-demo-id' || u.role === 'admin');
    console.log('\n--- ADMIN PROFILE RECORD ---');
    console.log({
      id: adminUser?.id,
      full_name: adminUser?.full_name,
      role: adminUser?.role,
      is_admin: adminUser?.is_admin,
      admin_role: adminUser?.admin_role,
      role_id: adminUser?.role_id,
      ref_code: adminUser?.ref_code,
      created_at: adminUser?.created_at,
    });

    console.log('\n--- ALL USERS SUMMARY ---');
    console.table(data.users?.map(u => ({
      id: u.id.slice(0, 15),
      full_name: u.full_name?.slice(0, 25),
      role: u.role,
      ref_code: u.ref_code,
      created_at: u.created_at?.slice(0, 10),
    })));

  } catch (e) {
    console.log('Raw output:\n', res.stdout.slice(0, 1000));
  }

  ssh.dispose();
}

test().catch(console.error);
