const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const res = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=v-supplier-1"');
  console.log('STATUS/BODY:', res.stdout);

  const res2 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=v-supplier-2"');
  console.log('STATUS/BODY 2:', res2.stdout);

  ssh.dispose();
}

test();
