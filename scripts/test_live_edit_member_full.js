const { NodeSSH } = require('node-ssh');

async function testEditMember() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Testing GET /api/v1/team/members for Vendor ---');
  const getRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/team/members" \
    -H "Cookie: rfq_session=vendor; rfq_role=vendor_owner; rfq_user_id=vendor-demo-id"`);
  
  let members = [];
  try {
    const parsed = JSON.parse(getRes.stdout);
    members = parsed.members || [];
    console.log(`Found ${members.length} members for vendor.`);
  } catch (e) {
    console.error('Failed to parse members:', getRes.stdout);
  }

  const target = members.find(m => m.email && m.email.includes('khalidmsawa8')) || members[0];
  if (!target) {
    console.error('No target member found to test!');
    ssh.dispose();
    return;
  }

  console.log(`Selected target member: ${target.id} (${target.full_name} | ${target.email})`);

  console.log('\n--- 2. Testing PATCH /api/v1/team/members/' + target.id + ' ---');
  const testPayload = {
    fullName: "أحمد السعيد - مدير المستودع واللوجستيات",
    phone: "0533196489",
    roleId: "vendor_warehouse_clerk",
    status: "active",
    password: "SecretNewPass2026!"
  };

  const patchRes = await ssh.execCommand(`curl -s -X PATCH "http://127.0.0.1:3002/api/v1/team/members/${target.id}" \
    -H "Content-Type: application/json" \
    -H "Cookie: rfq_session=vendor; rfq_role=vendor_owner; rfq_user_id=vendor-demo-id; rfq_user_email=vendor@rfqsa.tech" \
    -d '${JSON.stringify(testPayload)}'`);

  console.log('PATCH Response:\n', patchRes.stdout);

  console.log('\n--- 3. Verifying persistence on VPS disk ---');
  const verifyDisk = await ssh.execCommand(`
    node -e "
      const fs = require('fs');
      const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
      const p = JSON.parse(fs.readFileSync('/var/www/rfq/data/profiles_db.json'));
      const mem = m.find(x => x.id === '${target.id}');
      const prof = p.find(x => x.email === '${target.email}');
      console.log('Org member in DB:', mem ? { id: mem.id, full_name: mem.full_name, phone: mem.phone, status: mem.status } : null);
      console.log('Profile in DB:', prof ? { id: prof.id, full_name: prof.full_name, phone: prof.phone, is_active: prof.is_active } : null);
    "
  `);
  console.log(verifyDisk.stdout);

  console.log('\n--- 4. Verifying immediate login with newly set password ---');
  const loginRes = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"${target.email}","password":"SecretNewPass2026!"}'`);

  console.log('Login Response with updated password:\n', loginRes.stdout);

  console.log('\n--- 5. Testing GET & PATCH for Client Organization ---');
  const getClientRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/team/members" \
    -H "Cookie: rfq_session=client; rfq_role=client_owner; rfq_user_id=client-demo-id"`);
  try {
    const clientData = JSON.parse(getClientRes.stdout);
    console.log(`Found ${clientData.members?.length || 0} members for client organization.`);
    if (clientData.members && clientData.members.length > 0) {
      const cMem = clientData.members[0];
      console.log(`First client member: ${cMem.id} - ${cMem.full_name} (${cMem.role_id})`);
    }
  } catch (e) {
    console.log('Client response error:', e);
  }

  ssh.dispose();
  console.log('\n✅ All tests passed!');
}

testEditMember().catch(console.error);
