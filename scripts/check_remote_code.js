const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const resLogin = await ssh.execCommand('sed -n "100,170p" /var/www/rfq/app/api/v1/auth/login/route.ts');
  console.log('remote login/route.ts lines 100-170:\n', resLogin.stdout);

  ssh.dispose();
}

check().catch(console.error);
