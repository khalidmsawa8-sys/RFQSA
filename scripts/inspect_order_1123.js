const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const script = `
const fs = require('fs');
const orders = JSON.parse(fs.readFileSync('/var/www/rfq/data/orders_db.json'));
const o = orders.find(x => String(x.id).includes('1123'));
console.log('--- ORDERS_DB ---');
console.log(JSON.stringify(o, null, 2));

const deliveries = JSON.parse(fs.readFileSync('/var/www/rfq/data/deliveries_db.json'));
const d = deliveries.find(x => String(x.order_id).includes('1123') || String(x.id).includes('1123'));
console.log('--- DELIVERIES_DB ---');
console.log(JSON.stringify(d, null, 2));

const rfqs = JSON.parse(fs.readFileSync('/var/www/rfq/data/rfqs_db.json'));
const r = rfqs.find(x => String(x.id).includes('1123'));
console.log('--- RFQS_DB ---');
console.log(JSON.stringify(r, null, 2));
`;
  const res = await ssh.execCommand(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
  console.log(res.stdout);
  console.error(res.stderr);
  ssh.dispose();
})();
