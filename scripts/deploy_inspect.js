const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function inspectServer() {
  console.log('Connecting to 147.93.56.252...');
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ Connected successfully to server!\n');

    const run = async (cmd) => {
      console.log(`\n--- Running: [${cmd}] ---`);
      const res = await ssh.execCommand(cmd);
      if (res.stdout) console.log('STDOUT:\n' + res.stdout);
      if (res.stderr) console.log('STDERR:\n' + res.stderr);
      return res;
    };

    await run('uname -a');
    await run('node -v || which node');
    await run('pm2 list || which pm2');
    await run('docker ps || which docker');
    await run('nginx -t || which nginx');
    await run('df -h');
    await run('find /var/www /root /home /opt -maxdepth 3 -name "package.json" 2>/dev/null');

    ssh.dispose();
  } catch (err) {
    console.error('❌ Connection or execution failed:', err);
  }
}

inspectServer();
