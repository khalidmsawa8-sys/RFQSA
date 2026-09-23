const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('curl -m 5 -s http://127.0.0.1:3002/api/v1/admin/users/client-demo-id -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"');
  console.log('STDOUT:', res.stdout);
  console.log('STDERR:', res.stderr);

  ssh.dispose();
}

main().catch(console.error);
