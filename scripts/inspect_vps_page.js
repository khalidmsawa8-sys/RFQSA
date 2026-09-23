const { NodeSSH } = require('node-ssh');
async function run() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const res = await ssh.execCommand('sed -n "1055,1135p" "/var/www/rfq/app/vendor/quote/[rfqId]/page.tsx"');
  console.log('--- VPS CODE ---');
  console.log(res.stdout);
  ssh.dispose();
}
run().catch(console.error);
