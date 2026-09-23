const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployRoute() {
  console.log('Connecting to SSH server 147.93.56.252...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const localFile = path.join(__dirname, '..', 'app', 'api', 'v1', 'notifications', 'register-device', 'route.ts');
  const remoteFile = '/var/www/rfq/app/api/v1/notifications/register-device/route.ts';

  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/notifications/register-device');
  await ssh.putFile(localFile, remoteFile);
  console.log('✓ Uploaded register-device endpoint to server');

  console.log('Running build on server...');
  await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
  await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
  console.log('✓ PM2 Restarted successfully on production');

  ssh.dispose();
}

deployRoute().catch((err) => {
  console.error('Deploy error:', err);
  process.exit(1);
});
