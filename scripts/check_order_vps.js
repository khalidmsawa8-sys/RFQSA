const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const script = `
const fs = require('fs');
const dir = '/var/www/rfq/data';
console.log('Files in /var/www/rfq/data:', fs.existsSync(dir) ? fs.readdirSync(dir) : 'DIR NOT FOUND');
if (fs.existsSync(dir + '/orders_db.json')) {
  const orders = JSON.parse(fs.readFileSync(dir + '/orders_db.json', 'utf8'));
  const o = orders.find(x => String(x.id).includes('1123'));
  console.log('Found 1123 in orders_db:', o ? { id: o.id, status: o.status, courier_status: o.courier_status, deals: o.deals } : 'NOT FOUND');
}
if (fs.existsSync(dir + '/deliveries_db.json')) {
  const deliveries = JSON.parse(fs.readFileSync(dir + '/deliveries_db.json', 'utf8'));
  const d = deliveries.find(x => String(x.order_id).includes('1123') || String(x.id).includes('1123'));
  console.log('Found 1123 in deliveries_db:', d ? { id: d.id, order_id: d.order_id, delivery_status: d.delivery_status } : 'NOT FOUND');
}
`;
  const res = await ssh.execCommand(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
  console.log(res.stdout);
  console.log(res.stderr);
  process.exit();
})();
