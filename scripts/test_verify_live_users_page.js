const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('sed -n "420,460p" "/var/www/rfq/app/client/wallet/page.tsx"');
  console.log('Remote client wallet lines 420-460:\n', res.stdout);

  ssh.dispose();
}

test().catch(console.error);
