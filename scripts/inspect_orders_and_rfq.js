const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res1 = await ssh.execCommand('grep -n "5940" /var/www/rfq/data/orders_db.json');
  console.log('Orders 5940:', res1.stdout || 'NONE');

  const res2 = await ssh.execCommand('grep -n -C 5 "RFQ-5940" /var/www/rfq/data/rfqs_db.json');
  console.log('RFQs 5940:\n', res2.stdout || 'NONE');

  const res3 = await ssh.execCommand('tail -n 30 /var/www/rfq/data/orders_db.json');
  console.log('Tail orders:\n', res3.stdout || 'NONE');

  ssh.dispose();
}

main().catch(console.error);
