const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/admin/(dashboard)/users/page.tsx',
  'app/admin/(dashboard)/users/[userId]/page.tsx',
  'app/api/v1/admin/users/route.ts',
  'lib/supabase/server.ts',
  'app/api/v1/admin/assign-role/route.ts',
  'lib/rbac/rbac-guard.server.ts',
  'app/api/v1/admin/roles/route.ts',
  'app/api/v1/admin/users/[userId]/route.ts',
  'app/admin/(dashboard)/roles/page.tsx',
];

async function deploy() {
  const ssh = new NodeSSH();
  console.log('Connecting to VPS 147.93.56.252...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const localBase = path.join(__dirname, '..');
  const remoteBase = '/var/www/rfq';

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}`);
    await ssh.putFile(localPath, remotePath);
  }

  console.log('Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1500));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }

  console.log('Restarting PM2 process...');
  const restartRes = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(restartRes.stdout);

  ssh.dispose();
  console.log('Deployment completed successfully!');
}

deploy().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
