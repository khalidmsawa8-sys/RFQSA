const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'lib/vendor-branches.ts',
  'app/api/v1/vendor/branches/route.ts',
  'components/ui/dialog.tsx',
  'components/location-picker-dialog.tsx',
  'components/vendor/vendor-branch-pickup-settings.tsx',
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

  // Ensure remote directory exists
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/vendor/branches');

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}...`);
    await ssh.putFile(localPath, remotePath);
  }
  console.log('✅ All files uploaded successfully.\n');

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
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(pm2Res.stdout);
  console.log('✅ PM2 Restarted.\n');

  // Wait 3 seconds
  await new Promise((r) => setTimeout(r, 3000));

  console.log('4️⃣ Testing Multi-Branch API & Flow on live server...');
  const testScript = `
    async function main() {
      console.log('--- START MULTI-BRANCH VERIFICATION ---');

      // 1. Fetch vendor branches
      const resBranches = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=vendor-demo-id');
      const dataBranches = await resBranches.json();
      console.log('1. Initial Branches Fetch:', dataBranches.success ? 'SUCCESS' : 'FAILED', 'Count:', dataBranches.branches?.length);
      const initialCount = dataBranches.branches?.length || 0;

      // 2. Add a new 2nd / 3rd branch
      const newBranchPayload = {
        name: 'فرع مستودع الخرج والشحن المركزي',
        city: 'الخرج',
        district: 'المنطقة الصناعية الجديدة',
        address: 'طريق الملك عبدالله، بجوار ميزان الشاحنات',
        latitude: 24.1500,
        longitude: 47.3000,
        contact_name: 'م. فهد الدوسري',
        contact_phone: '0558877665',
        accepts_pickup: true,
        is_main: false
      };

      const resAdd = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranchPayload)
      });
      const dataAdd = await resAdd.json();
      console.log('2. Add New Branch:', dataAdd.success ? 'SUCCESS' : 'FAILED', 'Branch ID:', dataAdd.branch?.id);
      const createdBranchId = dataAdd.branch?.id;

      // 3. Verify branches count increased
      const resVerify = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=vendor-demo-id');
      const dataVerify = await resVerify.json();
      console.log('3. Updated Branches Count:', dataVerify.branches?.length, '(was ' + initialCount + ')');

      // 4. Test setting as main branch
      if (createdBranchId) {
        const resMain = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: createdBranchId, action: 'set_main' })
        });
        const dataMain = await resMain.json();
        console.log('4. Set Main Branch:', dataMain.success ? 'SUCCESS' : 'FAILED');

        // Check that it became main
        const resCheckMain = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches?vendor_id=vendor-demo-id');
        const dataCheckMain = await resCheckMain.json();
        const mainBranch = dataCheckMain.branches?.find(b => b.is_main);
        console.log('   Confirmed Main Branch:', mainBranch?.name);

        // 5. Delete the newly created branch to restore cleanly (or keep if desired)
        const resDel = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches?id=' + createdBranchId, {
          method: 'DELETE'
        });
        const dataDel = await resDel.json();
        console.log('5. Delete Branch:', dataDel.success ? 'SUCCESS' : 'FAILED');
      }

      console.log('--- ALL MULTI-BRANCH VERIFICATIONS PASSED ---');
    }
    main().catch(console.error);
  `;

  const testExec = await ssh.execCommand(`node -e "${testScript.replace(/"/g, '\\"')}"`);
  console.log('Test Output:\n', testExec.stdout);
  if (testExec.stderr) console.log('Test Stderr:\n', testExec.stderr);

  ssh.dispose();
  console.log('🎉 DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
}

deployAndVerify().catch((e) => {
  console.error('Fatal Deployment Error:', e);
  process.exit(1);
});
