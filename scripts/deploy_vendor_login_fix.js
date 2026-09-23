const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployAndVerify() {
  console.log('🚀 Starting deployment of Vendor Login Fix to VPS (147.93.56.252)...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });
  console.log('✅ SSH Connected.');

  // 1. Upload route.ts
  const localRoutePath = path.join(__dirname, '..', 'app', 'api', 'v1', 'auth', 'login', 'route.ts');
  const remoteRoutePath = '/var/www/rfq/app/api/v1/auth/login/route.ts';
  console.log(`📤 Uploading ${localRoutePath} -> ${remoteRoutePath}`);
  await ssh.putFile(localRoutePath, remoteRoutePath);
  console.log('✅ route.ts uploaded.');

  // 2. Update profiles_db.json and organization_members_db.json directly on server
  console.log('🔧 Updating server databases for vendor credentials...');
  const updateScript = `
    const fs = require('fs');
    
    // Update profiles_db.json
    try {
      const pFile = '/var/www/rfq/data/profiles_db.json';
      const profiles = JSON.parse(fs.readFileSync(pFile, 'utf8'));
      for (const p of profiles) {
        if (p.id === 'vendor-demo-id' || p.email === 'vendor@rfqsa.tech') {
          p.password = '123456';
          p.role = 'vendor';
          p.role_id = 'vendor_owner';
          p.custom_role = 'vendor_owner';
          p.is_active = true;
          console.log('Updated profile for vendor-demo-id');
        }
      }
      fs.writeFileSync(pFile, JSON.stringify(profiles, null, 2), 'utf8');
    } catch(e) {
      console.error('Error updating profiles_db.json:', e);
    }

    // Update organization_members_db.json
    try {
      const mFile = '/var/www/rfq/data/organization_members_db.json';
      const members = JSON.parse(fs.readFileSync(mFile, 'utf8'));
      for (const m of members) {
        if (m.user_id === 'vendor-demo-id' || m.email?.includes('vendor')) {
          m.password = '123456';
          m.role_id = 'vendor_owner';
          m.status = 'active';
          console.log('Updated member:', m.id, m.email);
        }
      }
      fs.writeFileSync(mFile, JSON.stringify(members, null, 2), 'utf8');
    } catch(e) {
      console.error('Error updating organization_members_db.json:', e);
    }
  `;
  const dbRes = await ssh.execCommand(`node -e "${updateScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { cwd: '/var/www/rfq' });
  console.log('DB Update output:', dbRes.stdout, dbRes.stderr);

  // 3. Build Next.js
  console.log('🏗️ Building Next.js on server...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
  console.log(buildRes.stdout.slice(-500));
  if (buildRes.code !== 0) {
    console.error('❌ Build failed:', buildRes.stderr);
    ssh.dispose();
    return;
  }
  console.log('✅ Build successful.');

  // 4. Restart PM2
  console.log('🔄 Restarting PM2 process...');
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
  console.log(pm2Res.stdout);

  // 5. Test login endpoints
  console.log('⏳ Waiting 4s for PM2 reload...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('🧪 Testing Login with vendor@rfqsa.tech and 123456...');
  const test1 = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"vendor@rfqsa.tech","password":"123456"}'`);
  console.log('Result 1 (123456):', test1.stdout);

  console.log('🧪 Testing Login with vendor@rfqsa.tech and P@ssword123...');
  const test2 = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"vendor@rfqsa.tech","password":"P@ssword123"}'`);
  console.log('Result 2 (P@ssword123):', test2.stdout);

  console.log('🧪 Testing Login with short username "vendor" and 123456...');
  const test3 = await ssh.execCommand(`curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"vendor","password":"123456"}'`);
  console.log('Result 3 ("vendor"):', test3.stdout);

  ssh.dispose();
  console.log('🎉 Deployment and verification finished.');
}

deployAndVerify().catch(err => {
  console.error('Fatal deployment error:', err);
  ssh.dispose();
});
