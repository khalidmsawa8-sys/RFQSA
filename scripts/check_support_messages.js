const { NodeSSH } = require('node-ssh');

async function run() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const res = await ssh.execCommand(
    "curl -s http://127.0.0.1:3002/api/v1/support/TKT-4574/messages"
  );
  console.log('TKT-4574 Messages:');
  console.log(res.stdout);
  ssh.dispose();
}

run().catch(console.error);
