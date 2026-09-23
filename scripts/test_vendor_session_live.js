const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testSession() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Testing POST login request ---');
  const res = await ssh.execCommand('curl -i -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"vendor@rfqsa.tech","password":"123456"}\'');
  console.log('Login Response Output:');
  console.log(res.stdout);

  const cookies = res.stdout.match(/set-cookie: ([^;\r\n]+)/gi);
  console.log('Found Cookies:', cookies);

  if (cookies) {
    const cookieHeader = cookies.map(c => c.replace(/set-cookie:\s*/i, '')).join('; ');
    console.log('--- 2. Requesting /vendor dashboard with Session Cookies ---');
    const dash = await ssh.execCommand(`curl -s -i -H "Cookie: ${cookieHeader}" http://127.0.0.1:3002/vendor`);
    console.log('Dashboard Response Headers & Head:');
    console.log(dash.stdout.slice(0, 500));
  }

  ssh.dispose();
}

testSession().catch(console.error);
