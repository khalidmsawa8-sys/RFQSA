const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectServerOrdersOnly() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });
    const res = await ssh.execCommand('cat /var/www/rfq/data/orders_db.json');
    console.log('--- SERVER orders_db.json ---');
    const orders = JSON.parse(res.stdout || '[]');
    console.log('Count:', orders.length);
    orders.forEach(o => {
      console.log('ID:', o.id, 'RFQ:', o.rfq_id, 'Status:', o.status, 'Total:', o.total_price, 'Created:', o.created_at);
    });
  } finally {
    ssh.dispose();
  }
}

inspectServerOrdersOnly();
