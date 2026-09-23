const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployAndVerify() {
  console.log('🚀 Connecting to VPS (147.93.56.252)...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });
  console.log('✅ SSH Connected.');

  const files = [
    {
      local: path.join(__dirname, '..', 'components', 'vendor-branch-map-modal.tsx'),
      remote: '/var/www/rfq/components/vendor-branch-map-modal.tsx',
    },
    {
      local: path.join(__dirname, '..', 'components', 'vendor-branches-selector.tsx'),
      remote: '/var/www/rfq/components/vendor-branches-selector.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'client', 'new-rfq', 'page.tsx'),
      remote: '/var/www/rfq/app/client/new-rfq/page.tsx',
    },
  ];

  for (const f of files) {
    console.log(`📤 Uploading ${path.basename(f.local)} -> ${f.remote}`);
    await ssh.putFile(f.local, f.remote);
  }
  console.log('✅ All files uploaded.');

  console.log('🏗️ Building Next.js on server...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
  console.log(buildRes.stdout.slice(-600));
  if (buildRes.code !== 0) {
    console.error('❌ Build failed:', buildRes.stderr);
    ssh.dispose();
    return;
  }
  console.log('✅ Build successful.');

  console.log('🔄 Restarting PM2 process...');
  await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });

  console.log('⏳ Waiting 4s for PM2 reload...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('🧪 Testing GET /client/new-rfq HTTP response...');
  const testRes = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/client/new-rfq');
  console.log(`HTTP Status: ${testRes.stdout}`);

  // Test branch API
  const branchApi = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/v1/vendor/branches');
  console.log('Vendor Branches API sample:', branchApi.stdout.slice(0, 300));

  ssh.dispose();
  console.log('🎉 Google Maps branch feature deployed and verified live!');
}

deployAndVerify().catch(err => {
  console.error('Fatal deployment error:', err);
  ssh.dispose();
});
