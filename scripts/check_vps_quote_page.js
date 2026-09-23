const { NodeSSH } = require('node-ssh');

async function checkVPS() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- VPS GIT STATUS ---');
  const status = await ssh.execCommand('git status -s', { cwd: '/var/www/rfq' });
  console.log(status.stdout);

  console.log('--- VPS GIT DIFF ON QUOTE PAGE ---');
  const diff = await ssh.execCommand('git diff app/vendor/quote/[rfqId]/page.tsx', { cwd: '/var/www/rfq' });
  console.log(diff.stdout);

  console.log('--- VPS PM2 LOGS ---');
  const logs = await ssh.execCommand('pm2 logs rfq --lines 30 --nostream');
  console.log(logs.stdout);
  console.log(logs.stderr);

  ssh.dispose();
}

checkVPS().catch(console.error);
