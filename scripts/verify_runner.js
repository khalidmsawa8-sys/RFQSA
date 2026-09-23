const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function run() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const localTest = path.join(__dirname, 'verify_user_isolation_live.js');
  const remoteTest = '/var/www/rfq/scripts/verify_user_isolation_live.js';

  await ssh.putFile(localTest, remoteTest);

  const res = await ssh.execCommand('node scripts/verify_user_isolation_live.js', {
    cwd: '/var/www/rfq',
  });

  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  process.exit(res.code);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
