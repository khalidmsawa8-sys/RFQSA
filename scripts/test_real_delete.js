const { NodeSSH } = require('node-ssh');

async function testRealDelete() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const dummyId = 'mem_test_del_' + Date.now();

  console.log('1. Adding dummy member:', dummyId);
  await ssh.execCommand(`node -e "
    const fs = require('fs');
    const mFile = '/var/www/rfq/data/organization_members_db.json';
    let members = JSON.parse(fs.readFileSync(mFile, 'utf-8'));
    members.push({
      id: '${dummyId}',
      organization_id: 'org-client-demo-id',
      email: 'delete_me_${Date.now()}@test.com',
      full_name: 'عضو تجريبي للاختبار',
      role_id: 'client_technician',
      status: 'active',
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(mFile, JSON.stringify(members, null, 2));
  "`);

  console.log('2. Sending DELETE request for', dummyId);
  const delRes = await ssh.execCommand(`curl -s -X DELETE http://127.0.0.1:3002/api/v1/team/members/${dummyId} \
    -H "Cookie: rfq_session=client; rfq_role=client_owner; rfq_user_id=client-demo-id; rfq_user_email=client@rfqsa.tech"`);
  console.log('DELETE response:\n', delRes.stdout);

  console.log('3. Checking if dummy member still exists in organization_members_db.json:');
  const checkRes = await ssh.execCommand(`node -e "
    const fs = require('fs');
    const mFile = '/var/www/rfq/data/organization_members_db.json';
    let members = JSON.parse(fs.readFileSync(mFile, 'utf-8'));
    const found = members.find(m => m.id === '${dummyId}');
    console.log('Found in DB:', Boolean(found));
  "`);
  console.log(checkRes.stdout);

  ssh.dispose();
}

testRealDelete().catch(console.error);
