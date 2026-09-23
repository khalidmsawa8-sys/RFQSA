const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('head -n 45 /var/www/rfq/data/orders_db.json');
  console.log(res.stdout);

  ssh.dispose();
}

main().catch(console.error);
