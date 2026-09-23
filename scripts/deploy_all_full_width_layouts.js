const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING FULL-WIDTH FLUID LAYOUT TO VPS SERVER');
  console.log('Server: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (root@147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const projectRoot = path.join(__dirname, '..');

    const filesToUpload = [
      // Layouts & Shells
      'components/dashboard-sidebar.tsx',
      'app/client/layout.tsx',
      'app/vendor/layout.tsx',
      'components/admin/admin-sidebar-nav.tsx',
      'components/admin/admin-dashboard-shell.tsx',
      'app/admin/(dashboard)/layout.tsx',

      // Client Portal
      'app/client/orders/orders-client.tsx',
      'app/client/dashboard-client.tsx',
      'app/client/wallet/page.tsx',
      'app/client/invoices/page.tsx',
      'app/client/garage/page.tsx',
      'app/client/roles/page.tsx',
      'app/client/support/support-client.tsx',
      'app/client/support/[id]/page.tsx',
      'app/client/rfq/[rfqId]/page.tsx',
      'app/client/new-rfq/page.tsx',

      // Vendor Portal
      'app/vendor/orders/orders-client.tsx',
      'app/vendor/radar/page.tsx',
      'app/vendor/wallet/page.tsx',
      'app/vendor/invoices/page.tsx',
      'app/vendor/roles/page.tsx',
      'app/vendor/support/vendor-support-client.tsx',
      'app/vendor/support/[id]/page.tsx',
      'app/vendor/quote/[rfqId]/page.tsx',

      // Admin Portal
      'app/admin/(dashboard)/orders/page.tsx',
      'app/admin/(dashboard)/users/page.tsx',
      'app/admin/(dashboard)/users/[userId]/page.tsx',
      'app/admin/(dashboard)/rfqs/page.tsx',
      'app/admin/(dashboard)/invoices/page.tsx',
      'app/admin/(dashboard)/wallet/page.tsx',
      'app/admin/(dashboard)/delivery/page.tsx',
      'app/admin/(dashboard)/coupons/page.tsx',
      'app/admin/(dashboard)/settings/page.tsx',
      'app/admin/(dashboard)/roles/page.tsx',
      'app/admin/(dashboard)/notifications/page.tsx',
      'app/admin/(dashboard)/support/page.tsx',
      'app/admin/(dashboard)/support/[id]/page.tsx',

      // Shared Views & Courier
      'components/dashboard/slide-dashboard.tsx',
      'app/deal/[orderId]/deal-page-client.tsx',
      'app/profile/page.tsx',
      'app/profile/reviews/page.tsx',
      'components/identity/unified-identity-settings-view.tsx',
      'components/vendors-map/vendors-map-client.tsx',
      'app/invoices/page.tsx',
      'app/wallet/page.tsx',
      'app/courier/wallet/page.tsx',
      'app/courier/invoices/page.tsx',
      'app/courier/support/courier-support-client.tsx',
    ];

    console.log(`2️⃣ Uploading ${filesToUpload.length} updated files to server...`);
    let uploadedCount = 0;

    for (const relPath of filesToUpload) {
      const localPath = path.join(projectRoot, relPath);
      // Normalized remote path with forward slashes
      const remotePath = '/var/www/rfq/' + relPath.replace(/\\/g, '/');

      if (fs.existsSync(localPath)) {
        // Ensure remote directory exists
        const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
        await ssh.execCommand(`mkdir -p "${remoteDir}"`);
        
        await ssh.putFile(localPath, remotePath);
        uploadedCount++;
        console.log(`   ✓ [${uploadedCount}/${filesToUpload.length}] Uploaded: ${relPath}`);
      } else {
        console.warn(`   ⚠️ File missing locally: ${localPath}`);
      }
    }
    console.log(`\n✅ ${uploadedCount} files uploaded successfully!\n`);

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: '/var/www/rfq' });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) {
          console.error('STDERR:', res.stderr);
        } else {
          console.log('LOG/NOTICE:', res.stderr);
        }
      }
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('3️⃣ Running Next.js build on server (/var/www/rfq)...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 4 seconds for server to be fully ready...');
    await new Promise((r) => setTimeout(r, 4000));

    console.log('\n5️⃣ Checking PM2 status...');
    const pm2Status = await ssh.execCommand('pm2 status rfq');
    console.log(pm2Status.stdout);

    console.log('\n6️⃣ Checking local HTTP response from server...');
    const curlCheck = await ssh.execCommand('curl -s -I http://localhost:3000 | head -n 5');
    console.log(curlCheck.stdout);

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT TO PRODUCTION COMPLETED SUCCESSFULLY!');
    console.log('🌐 Live URL: https://rfqsa.tech');
    console.log('====================================================\n');

    ssh.dispose();
  } catch (err) {
    console.error('\n❌ Deployment failed with error:', err.message);
    if (ssh) ssh.dispose();
    process.exit(1);
  }
}

deploy();
