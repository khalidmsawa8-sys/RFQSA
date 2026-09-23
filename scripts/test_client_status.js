const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });
  console.log('--- CURL OUTPUT ---');
  const res = await ssh.execCommand('sleep 2 && curl -s -I "http://127.0.0.1:3002/client" -H "Cookie: rfq_session=client"');
  console.log(res.stdout);
  console.log('--- PM2 STATUS ---');
  const pm2 = await ssh.execCommand('pm2 status');
  console.log(pm2.stdout);
  ssh.dispose();
}

test();
