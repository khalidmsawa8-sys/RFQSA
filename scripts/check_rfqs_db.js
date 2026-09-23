const fs = require('fs');
const { NodeSSH } = require('node-ssh');

async function main() {
  if (fs.existsSync('data/rfqs_db.json')) {
    const local = JSON.parse(fs.readFileSync('data/rfqs_db.json', 'utf8'));
    console.log(`Local rfqs count: ${local.length}`);
    local.forEach((r) => console.log(`  - [Local] ${r.id} | ${r.car_make} ${r.car_model} | status: ${r.status} | created: ${r.created_at}`));
  } else {
    console.log('No local data/rfqs_db.json');
  }

  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const remote = await ssh.execCommand('node -e "const fs = require(\'fs\'); if (fs.existsSync(\'/var/www/rfq/data/rfqs_db.json\')) { const d = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/rfqs_db.json\')); console.log(\'VPS rfqs count:\', d.length); d.forEach(r => console.log(\'  - [VPS] \' + r.id + \' | \' + r.car_make + \' \' + r.car_model + \' | status: \' + r.status + \' | created: \' + r.created_at)); } else { console.log(\'No VPS data/rfqs_db.json\'); } if (fs.existsSync(\'/var/www/rfq/data/orders_db.json\')) { const o = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/orders_db.json\')); console.log(\'VPS orders count:\', o.length); o.forEach(x => console.log(\'  - [VPS Order] \' + x.id + \' | status: \' + x.status + \' | total: \' + x.total_price)); }"');
  console.log('\nVPS Data:');
  console.log(remote.stdout);
  if (remote.stderr) console.error('VPS stderr:', remote.stderr);

  ssh.dispose();
}

main();
