const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspectOrd2491() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });
    const res = await ssh.execCommand('node -e "const fs=require(\\\"fs\\\"); const o=JSON.parse(fs.readFileSync(\\\"/var/www/rfq/data/orders_db.json\\\")); console.log(JSON.stringify(o.find(x => x.id === \\\"ORD-2491\\\"), null, 2));"');
    console.log('--- ORD-2491 ---');
    console.log(res.stdout);
  } finally {
    ssh.dispose();
  }
}

inspectOrd2491();
