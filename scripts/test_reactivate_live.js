const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('curl -s -X POST http://127.0.0.1:3002/api/rfqs/RFQ-1153/reactivate -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"');
  console.log('Reactivate response:', res.stdout);

  const check = await ssh.execCommand('node -e "const fs = require(\'fs\'); const d = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/rfqs_db.json\')); const r = d.find(x => x.id === \'RFQ-1153\'); console.log(\'RFQ-1153 status in rfqs_db.json:\', r ? r.status : \'not found\', \'created_at:\', r ? r.created_at : \'\');"');
  console.log(check.stdout);

  ssh.dispose();
}

test();
