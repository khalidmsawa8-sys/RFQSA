const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectServerOrders() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });
    const res = await ssh.execCommand('cat /var/www/rfq/data/orders_db.json');
    console.log('--- SERVER orders_db.json ---');
    console.log(res.stdout);

    const resDeliveries = await ssh.execCommand('cat /var/www/rfq/data/deliveries_db.json');
    console.log('--- SERVER deliveries_db.json ---');
    console.log(resDeliveries.stdout);

    const resRfqs = await ssh.execCommand('cat /var/www/rfq/data/rfqs_db.json');
    console.log('--- SERVER rfqs_db.json ---');
    console.log(resRfqs.stdout.slice(0, 1000));
  } finally {
    ssh.dispose();
  }
}

inspectServerOrders();
