const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const errRes = await ssh.execCommand('tail -n 60 /root/.pm2/logs/rfq-error.log');
  console.log('=== ERROR LOG ===\n', errRes.stdout);

  const outRes = await ssh.execCommand('tail -n 60 /root/.pm2/logs/rfq-out.log');
  console.log('=== OUT LOG ===\n', outRes.stdout);

  ssh.dispose();
}

main().catch(console.error);
