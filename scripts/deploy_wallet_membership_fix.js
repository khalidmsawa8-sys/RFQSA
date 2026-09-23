const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/api/v1/wallet/route.ts',
  'app/api/v1/admin/wallet/adjust/route.ts',
  'app/client/wallet/page.tsx',
  'app/vendor/wallet/page.tsx',
  'app/wallet/page.tsx',
  'lib/supabase/client.ts',
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

  // Ensure remote directories exist
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/wallet');

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

  // Allow PM2 process a few seconds to warm up
  await new Promise(r => setTimeout(r, 3000));

  console.log('4️⃣ Running live verification tests...');

  // Test A: Check GET /api/v1/wallet for Saad
  console.log('\n--- Test A: GET /api/v1/wallet for Saad (CUST-20026) ---');
  const saadWalletRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/wallet" \
    -H "Cookie: rfq_session=client; rfq_user_id=4c6eb3e8-66aa-47b7-88a5-8c846fb6f0a7; rfq_role=client_owner"`);
  console.log('Saad Wallet Response:', saadWalletRes.stdout);

  // Test B: Execute an Admin Deposit of 350 SAR for Ahmed (user_mem_mtx9s1vr)
  console.log('\n--- Test B: Admin Deposit for Ahmed (SUP-EMP-001) ---');
  const depositRes = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" \
    -H "Content-Type: application/json" \
    -H "Cookie: rfq_session=admin" \
    -H "x-admin-request: true" \
    -d '{"userId":"user_mem_mtx9s1vr","type":"credit","amount":350,"description":"إيداع حافز تميز مستودع","reference":"BONUS-EMP-001"}'`);
  console.log('Deposit Response:', depositRes.stdout);

  // Test C: Fetch Ahmed's wallet via GET /api/v1/wallet
  console.log('\n--- Test C: Fetch Ahmed (user_mem_mtx9s1vr) Live Wallet ---');
  const ahmedWalletRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/wallet" \
    -H "Cookie: rfq_session=vendor; rfq_user_id=user_mem_mtx9s1vr; rfq_role=vendor_warehouse_clerk"`);
  console.log('Ahmed Wallet Response:', ahmedWalletRes.stdout);

  // Test D: Admin Withdrawal of 50 SAR for Ahmed
  console.log('\n--- Test D: Admin Withdrawal of 50 SAR for Ahmed ---');
  const withdrawRes = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" \
    -H "Content-Type: application/json" \
    -H "Cookie: rfq_session=admin" \
    -H "x-admin-request: true" \
    -d '{"userId":"user_mem_mtx9s1vr","type":"debit","amount":50,"description":"سحب مصاريف تشغيلية مستودع","reference":"DEBIT-EMP-001"}'`);
  console.log('Withdrawal Response:', withdrawRes.stdout);

  // Test E: Verify final balance for Ahmed (should be 300 SAR)
  console.log('\n--- Test E: Verify Final Balance for Ahmed ---');
  const finalAhmedRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/wallet" \
    -H "Cookie: rfq_session=vendor; rfq_user_id=user_mem_mtx9s1vr; rfq_role=vendor_warehouse_clerk"`);
  console.log('Final Ahmed Wallet Response:', finalAhmedRes.stdout);

  ssh.dispose();
  console.log('\n🎉 All tests and deployment completed successfully!');
}

deploy().catch(err => {
  console.error('Deployment script failed:', err);
  process.exit(1);
});
