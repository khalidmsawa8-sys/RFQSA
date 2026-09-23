const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand(`node -e "
    const fs = require('fs');
    // Let's test the mock supabase logic in lib/supabase/server.ts or inspect pm2 logs!
    console.log('--- PM2 RECENT LOGS ---');
  "`);
  
  const pm2Logs = await ssh.execCommand('pm2 logs rfq --lines 40 --nostream');
  console.log(pm2Logs.stdout);
  console.log(pm2Logs.stderr);

  ssh.dispose();
}

main().catch(console.error);
