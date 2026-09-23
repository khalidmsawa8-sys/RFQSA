const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const filesToUpload = [
  { local: 'lib/notification-service.ts', remote: '/var/www/rfq/lib/notification-service.ts' },
  { local: 'lib/courier-service.ts', remote: '/var/www/rfq/lib/courier-service.ts' },
  { local: 'app/api/rfqs/route.ts', remote: '/var/www/rfq/app/api/rfqs/route.ts' },
  { local: 'app/api/quotes/route.ts', remote: '/var/www/rfq/app/api/quotes/route.ts' },
  { local: 'app/api/v1/notifications/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/route.ts' },
  { local: 'app/api/v1/notifications/unread-count/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/unread-count/route.ts' },
  { local: 'app/api/v1/notifications/[id]/read/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/[id]/read/route.ts' },
  { local: 'app/api/v1/notifications/read-all/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/read-all/route.ts' },
  { local: 'app/api/v1/notifications/devices/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/devices/route.ts' },
  { local: 'app/api/v1/notifications/register-device/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/register-device/route.ts' },
];

async function deploy() {
  console.log('Connecting to VPS...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });
  console.log('Connected!');

  const rootDir = path.resolve(__dirname, '..');

  for (const item of filesToUpload) {
    const localPath = path.join(rootDir, item.local);
    if (!fs.existsSync(localPath)) {
      console.warn(`Local file not found: ${localPath}`);
      continue;
    }
    const remoteDir = path.posix.dirname(item.remote);
    await ssh.execCommand(`mkdir -p "${remoteDir}"`);
    console.log(`Uploading ${item.local} -> ${item.remote}`);
    await ssh.putFile(localPath, item.remote);
  }

  console.log('Building Next.js on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
  console.log(buildRes.stdout);
  if (buildRes.stderr) console.error(buildRes.stderr);
  if (buildRes.code !== 0) {
    throw new Error(`Build failed with code ${buildRes.code}`);
  }

  console.log('Restarting PM2 process...');
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
  console.log(pm2Res.stdout);

  console.log('Backend notification sync & restart complete!');
  ssh.dispose();
}

deploy().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
