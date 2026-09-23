const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const res1 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/orders?live_sync=1"');
  const json1 = JSON.parse(res1.stdout);
  console.log('✅ Live Sync API OK! Orders count:', Object.keys(json1.statuses || {}).length);

  const res2 = await ssh.execCommand('curl -s -L "http://127.0.0.1:3002/client/orders"');
  console.log('✅ Client orders page rendered HTML length:', res2.stdout.length);

  const res3 = await ssh.execCommand('curl -s -L "http://127.0.0.1:3002/vendor/orders"');
  console.log('✅ Vendor orders page rendered HTML length:', res3.stdout.length);

  const res4 = await ssh.execCommand('curl -s -L "http://127.0.0.1:3002/deal/1123"');
  console.log('✅ Deal 1123 page rendered HTML length:', res4.stdout.length);

  const res5 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/orders/1123/status"');
  console.log('✅ Single status 1123:', res5.stdout);

  ssh.dispose();
}

test().catch(console.error);
