const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectRfq2491() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });
    const res = await ssh.execCommand('node -e "const fs=require(\\\"fs\\\"); const r=JSON.parse(fs.readFileSync(\\\"/var/www/rfq/data/rfqs_db.json\\\")); console.log(JSON.stringify(r.find(x => x.id === \\\"RFQ-2491\\\"), null, 2));"');
    console.log('--- RFQ-2491 ---');
    console.log(res.stdout);
  } finally {
    ssh.dispose();
  }
}

inspectRfq2491();
