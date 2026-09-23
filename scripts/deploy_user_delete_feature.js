const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/admin/(dashboard)/users/page.tsx',
  'app/api/v1/admin/users/[userId]/route.ts',
];

async function deploy() {
  const ssh = new NodeSSH();
  console.log('1️⃣ Connecting to VPS 147.93.56.252...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });
  console.log('✅ SSH Connected!\n');

  const localBase = path.join(__dirname, '..');
  const remoteBase = '/var/www/rfq';

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}...`);
    await ssh.putFile(localPath, remotePath);
  }
  console.log('✅ Files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1200));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const restartRes = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(restartRes.stdout);

  console.log('4️⃣ Testing Delete User feature via live script...');
  const testRes = await ssh.execCommand(`node -e "
    const fs = require('fs');
    const pFile = '/var/www/rfq/data/profiles_db.json';
    let profiles = JSON.parse(fs.readFileSync(pFile, 'utf-8'));
    
    // Create a temporary test user
    const testId = 'test-delete-' + Date.now();
    profiles.push({
      id: testId,
      full_name: 'مستخدم تجريبي للحذف',
      role: 'client',
      ref_code: 'TEST-DEL-1',
      phone: '0599999999',
      company_name: 'شركة تجريبية للحذف',
      created_at: new Date().toISOString(),
      is_admin: false,
      is_active: true
    });
    fs.writeFileSync(pFile, JSON.stringify(profiles, null, 2), 'utf-8');
    console.log('Temporary profile added:', testId);

    // Call API DELETE with permanent=true
    const http = require('http');
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3002,
      path: '/api/v1/admin/users/' + testId + '?permanent=true',
      method: 'DELETE',
      headers: {
        'x-admin-request': 'true'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('DELETE response status:', res.statusCode);
        console.log('DELETE response body:', data);
        
        // Verify from file
        const after = JSON.parse(fs.readFileSync(pFile, 'utf-8'));
        const exists = after.some(p => p.id === testId);
        console.log('Test user exists in profiles_db.json after permanent delete:', exists);
      });
    });
    req.on('error', err => console.error('DELETE error:', err));
    req.end();
  "`, { cwd: remoteBase });

  console.log(testRes.stdout);
  if (testRes.stderr) console.error(testRes.stderr);

  ssh.dispose();
  console.log('🎉 Done!');
}

deploy().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
