const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const res = await ssh.execCommand("sed -n '85,115p' /var/www/rfq/lib/delivery-state-machine.ts");
  console.log(res.stdout);
  process.exit();
})();
