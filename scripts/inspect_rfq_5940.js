const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('node -e "const rfqs = require(\'/var/www/rfq/data/rfqs_db.json\'); console.log(JSON.stringify(rfqs.find(r => r.id.includes(\'5940\')), null, 2));"');
  console.log(res.stdout);

  ssh.dispose();
}

main().catch(console.error);
