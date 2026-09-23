const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function findFlutter() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('find / -name "flutter" -type f -executable 2>/dev/null | head -n 10');
  console.log('Found flutter executables on VPS:\n', res.stdout);

  const androidRes = await ssh.execCommand('find / -name "sdkmanager" -type f 2>/dev/null | head -n 10');
  console.log('Found android sdk on VPS:\n', androidRes.stdout);

  ssh.dispose();
}

findFlutter();
