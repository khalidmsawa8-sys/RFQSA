const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testLiveSpecializations() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Login as Vendor ---');
  const loginRes = await ssh.execCommand('curl -i -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"vendor@rfqsa.tech","password":"123456"}\'');
  const cookies = loginRes.stdout.match(/set-cookie: ([^;\r\n]+)/gi);
  if (!cookies) {
    console.error('Failed to get session cookie from login');
    ssh.dispose();
    return;
  }
  const cookieHeader = cookies.map(c => c.replace(/set-cookie:\s*/i, '')).join('; ');

  console.log('--- 2. GET current vendor specializations ---');
  const getRes = await ssh.execCommand(`curl -s -H "Cookie: ${cookieHeader}" http://127.0.0.1:3002/api/v1/vendor/specializations`);
  console.log('GET Response:', getRes.stdout);

  console.log('--- 3. POST updated specializations (cooling_ac, electrical, brakes) ---');
  const postPayload = JSON.stringify({
    specialized_brands: ["toyota", "lexus", "nissan"],
    specializes_in_all_brands: false,
    specialized_categories: ["cooling_ac", "electrical", "brakes"],
    specializes_in_all_categories: false
  });
  const postRes = await ssh.execCommand(`curl -s -X POST -H "Cookie: ${cookieHeader}" -H "Content-Type: application/json" -d '${postPayload}' http://127.0.0.1:3002/api/v1/vendor/specializations`);
  console.log('POST Response:', postRes.stdout);

  console.log('--- 4. GET again to verify persistence ---');
  const getAgain = await ssh.execCommand(`curl -s -H "Cookie: ${cookieHeader}" http://127.0.0.1:3002/api/v1/vendor/specializations`);
  console.log('Verified GET Response:', getAgain.stdout);

  ssh.dispose();
  console.log('✅ Vendor specializations API live test complete!');
}

testLiveSpecializations().catch(err => {
  console.error(err);
  process.exit(1);
});
