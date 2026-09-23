const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Testing GET /client/orders ...');
  const t0 = Date.now();
  const res = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code} time=%{time_total}s" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id" "http://127.0.0.1:3002/client/orders"');
  console.log('Result:', res.stdout, `(took ${Date.now() - t0}ms)`);

  const pm2Logs = await ssh.execCommand('pm2 logs rfq --lines 30 --nostream');
  console.log('PM2 Logs:\n', pm2Logs.stdout);

  ssh.dispose();
}

main().catch(console.error);
