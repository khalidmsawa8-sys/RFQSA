const { NodeSSH } = require('node-ssh');

const ssh = new NodeSSH();

async function inspect() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const run = async (cmd) => {
    console.log(`\n--- [${cmd}] ---`);
    const res = await ssh.execCommand(cmd, { cwd: '/var/www/rfq' });
    console.log(res.stdout || res.stderr);
  };

  await run('node -e "const fs = require(\'fs\'); const s = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/support_requests_db.json\')); console.log(\'Support requests count:\', s.length, s);"');
  await run('node -e "const fs = require(\'fs\'); const m = JSON.parse(fs.readFileSync(\'/var/www/rfq/data/support_messages_db.json\')); console.log(\'Support messages count:\', m.length, m);"');

  ssh.dispose();
}

inspect().catch(console.error);
