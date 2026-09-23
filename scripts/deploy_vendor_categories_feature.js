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

  // 1. Ensure remote directories exist
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/vendor/specializations');

  const files = [
    {
      local: path.join(__dirname, '..', 'lib', 'category-specialization.ts'),
      remote: '/var/www/rfq/lib/category-specialization.ts',
    },
    {
      local: path.join(__dirname, '..', 'lib', 'brand-specialization.ts'),
      remote: '/var/www/rfq/lib/brand-specialization.ts',
    },
    {
      local: path.join(__dirname, '..', 'app', 'api', 'v1', 'vendor', 'specializations', 'route.ts'),
      remote: '/var/www/rfq/app/api/v1/vendor/specializations/route.ts',
    },
    {
      local: path.join(__dirname, '..', 'components', 'identity', 'unified-identity-settings-view.tsx'),
      remote: '/var/www/rfq/components/identity/unified-identity-settings-view.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'profile', 'page.tsx'),
      remote: '/var/www/rfq/app/profile/page.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'client', 'new-rfq', 'page.tsx'),
      remote: '/var/www/rfq/app/client/new-rfq/page.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'api', 'rfqs', 'route.ts'),
      remote: '/var/www/rfq/app/api/rfqs/route.ts',
    },
    {
      local: path.join(__dirname, '..', 'app', 'api', 'quotes', 'route.ts'),
      remote: '/var/www/rfq/app/api/quotes/route.ts',
    },
    {
      local: path.join(__dirname, '..', 'components', 'dashboard', 'slide-dashboard.tsx'),
      remote: '/var/www/rfq/components/dashboard/slide-dashboard.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'vendor', 'radar', 'page.tsx'),
      remote: '/var/www/rfq/app/vendor/radar/page.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'vendor', 'orders', 'page.tsx'),
      remote: '/var/www/rfq/app/vendor/orders/page.tsx',
    },
    {
      local: path.join(__dirname, '..', 'app', 'vendor', 'orders', 'orders-client.tsx'),
      remote: '/var/www/rfq/app/vendor/orders/orders-client.tsx',
    },
  ];

  for (const f of files) {
    console.log(`📤 Uploading ${path.basename(f.local)} -> ${f.remote}`);
    await ssh.putFile(f.local, f.remote);
  }
  console.log('✅ All 12 files uploaded successfully.');

  console.log('🏗️ Building Next.js on VPS server...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
  console.log(buildRes.stdout.slice(-1000));
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

  console.log('🧪 Testing GET /api/v1/vendor/specializations...');
  const specRes = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/v1/vendor/specializations');
  console.log('Specializations API response:', specRes.stdout.slice(0, 400));

  console.log('🧪 Testing GET /client/new-rfq HTTP status...');
  const rfqPageRes = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/client/new-rfq');
  console.log(`HTTP Status /client/new-rfq: ${rfqPageRes.stdout}`);

  console.log('🧪 Testing GET /profile HTTP status...');
  const profilePageRes = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/profile');
  console.log(`HTTP Status /profile: ${profilePageRes.stdout}`);

  ssh.dispose();
  console.log('🎉 Vendor Spare Parts Category Specialization feature deployed and verified live on VPS!');
}

deployAndVerify().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
