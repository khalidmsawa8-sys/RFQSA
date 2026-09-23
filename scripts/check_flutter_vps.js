const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('which flutter; flutter --version || echo "flutter not in PATH"');
  console.log('Flutter on VPS:', res.stdout);

  const javaRes = await ssh.execCommand('java -version; which javac');
  console.log('Java on VPS:', javaRes.stdout, javaRes.stderr);

  ssh.dispose();
}

check();
