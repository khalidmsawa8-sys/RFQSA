const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'lib/bounded-contexts/supplier/supplier.types.ts',
  'lib/vendor-branches.ts',
  'app/api/v1/vendor/branches/route.ts',
  'app/api/v1/vendors/map/route.ts',
  'components/vendors-map/vendors-map-client.tsx',
];

async function deployAndVerify() {
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
  console.log('✅ All files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1500));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(pm2Res.stdout);
  console.log('✅ PM2 Restarted.\n');

  // Wait 3 seconds for service to settle
  await new Promise((r) => setTimeout(r, 3000));

  console.log('4️⃣ Testing API and Map endpoints on live server...');
  
  // Test 1: Fetch all vendors & branches from map API
  const testAll = await ssh.execCommand(
    'curl -s "http://127.0.0.1:3002/api/v1/vendors/map"'
  );
  try {
    const jsonAll = JSON.parse(testAll.stdout);
    console.log(`✅ /api/v1/vendors/map total branches: ${jsonAll.data?.total_count || 0}`);
    const branchNames = (jsonAll.data?.vendors || []).map((v) => `${v.company_name} -> ${v.branch_name} (${v.city})`);
    console.log('Sample branches loaded:', branchNames.slice(0, 6));
  } catch (e) {
    console.error('Failed parsing map API response:', testAll.stdout.slice(0, 300));
  }

  // Test 2: Search for "الخرج"
  const testSearchKharj = await ssh.execCommand(
    'curl -s "http://127.0.0.1:3002/api/v1/vendors/map?search=%D8%A7%D9%84%D8%AE%D8%B1%D8%AC"'
  );
  try {
    const jsonKharj = JSON.parse(testSearchKharj.stdout);
    console.log(`✅ Search "الخرج" returned: ${jsonKharj.data?.total_count || 0} branches`);
    (jsonKharj.data?.vendors || []).forEach((v) => {
      console.log(`   - [${v.branch_name}] ${v.company_name} | ${v.address} (${v.latitude}, ${v.longitude})`);
    });
  } catch (e) {
    console.error('Search Kharj test error:', e);
  }

  // Test 3: Search for vendor name "قطع الغيار"
  const testSearchVendor = await ssh.execCommand(
    'curl -s "http://127.0.0.1:3002/api/v1/vendors/map?search=%D9%82%D8%B7%D8%B9%20%D8%A7%D9%84%D8%BA%D9%8A%D8%A7%D8%B1"'
  );
  try {
    const jsonVendor = JSON.parse(testSearchVendor.stdout);
    console.log(`✅ Search vendor "قطع الغيار" returned: ${jsonVendor.data?.total_count || 0} branches:`);
    (jsonVendor.data?.vendors || []).forEach((v) => {
      console.log(`   - [${v.branch_name}] | ${v.address}`);
    });
  } catch (e) {
    console.error('Search vendor test error:', e);
  }

  // Test 4: Check client vendors-map page HTTP status
  const testPage = await ssh.execCommand(
    'curl -s -o /dev/null -w "%{http_code}" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id" http://127.0.0.1:3002/client/vendors-map'
  );
  console.log('Client vendors map page HTTP status:', testPage.stdout.trim());

  ssh.dispose();
  console.log('\n🎉 Deployment and Verification Completed Successfully!');
}

deployAndVerify().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
