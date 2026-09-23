const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testUsersApi() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const testPayload = JSON.stringify({
    full_name: "عبدالله",
    phone: "0533196489",
    email: "khalid.ali@samnan.com.sa",
    role: "client",
    company_name: "معصوب",
    tax_number: "333333",
    commercial_register: "1010",
    national_address: "الرياض حي",
  });

  const cmd = `curl -s -X POST http://127.0.0.1:3002/api/v1/admin/users -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d '${testPayload}'`;
  const res = await ssh.execCommand(cmd);
  console.log("POST /api/v1/admin/users response:\n", res.stdout || res.stderr);

  ssh.dispose();
}

testUsersApi();
