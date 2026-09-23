const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024'
  });
  const res = await ssh.execCommand('node -e "const fs = require(\'fs\'); const o = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/orders_db.json\')); console.log(JSON.stringify(o.map(x => ({ id: x.id, rfq_id: x.rfq_id, status: x.status, vendor_id: x.vendor_id, client_id: x.client_id, deals: x.deals })), null, 2));"');
  console.log(res.stdout);
  ssh.dispose();
})();
