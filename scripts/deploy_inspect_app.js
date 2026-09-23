const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function inspectApp() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const run = async (cmd) => {
    console.log(`\n--- Running: [${cmd}] ---`);
    const res = await ssh.execCommand(cmd);
    if (res.stdout) console.log('STDOUT:\n' + res.stdout);
    if (res.stderr) console.log('STDERR:\n' + res.stderr);
    return res;
  };

  await run('ls -la /var/www/rfq');
  await run('cd /var/www/rfq && git status || true');
  await run('cd /var/www/rfq && git remote -v || true');
  await run('pm2 show rfq');
  await run('cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/* 2>/dev/null');

  ssh.dispose();
}

inspectApp();
