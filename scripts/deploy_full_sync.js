const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

const FILES_TO_SYNC = [
  // Lib & Core Architecture
  'lib/audit-logger.ts',
  'lib/invoice-canonical.ts',
  'lib/notification-service.ts',
  'lib/system-settings.ts',
  'lib/order-state-machine.ts',
  'lib/ratings-calculator.ts',
  'lib/vendor-branches.ts',
  'lib/wallet-ledger.ts',
  'lib/rbac/rbac-guard.server.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'lib/bounded-contexts/fleet/fleet.repository.ts',

  // Central Database JSON files
  'data/client_vehicles_db.json',
  'data/deal_reviews_db.json',
  'data/invoices_db.json',
  'data/profiles_db.json',
  'data/staff_audit_logs_db.json',
  'data/support_messages_db.json',
  'data/support_requests_db.json',
  'data/vendor_branches_db.json',
  'data/wallet_transactions_db.json',

  // API Routes
  'app/api/quotes/route.ts',
  'app/api/quotes/[id]/route.ts',
  'app/api/rfqs/route.ts',
  'app/api/v1/admin/profile/route.ts',
  'app/api/v1/admin/support/route.ts',
  'app/api/v1/admin/support/[id]/route.ts',
  'app/api/v1/admin/wallet/adjust/route.ts',
  'app/api/v1/admin/wallet/route.ts',
  'app/api/v1/auth/signup/route.ts',
  'app/api/v1/notifications/register-device/route.ts',
  'app/api/v1/orders/[id]/status/route.ts',
  'app/api/v1/vendor/branches/route.ts',
  'app/api/v1/vendor/orders/[id]/status/route.ts',
  'app/api/v1/vendors/[id]/route.ts',
  'app/api/v1/wallet/transaction/route.ts',
  'app/api/v1/wallet/transfer/route.ts',

  // Components
  'components/dashboard/slide-dashboard.tsx',
  'components/date-range-filter.tsx',
  'components/invoice-pdf-export.tsx',
  'components/notifications-panel.tsx',
  'components/vendor-details-modal.tsx',

  // Admin Dashboard
  'app/admin/(dashboard)/audit/page.tsx',
  'app/admin/(dashboard)/invoices/page.tsx',
  'app/admin/(dashboard)/support/page.tsx',
  'app/admin/(dashboard)/users/[userId]/page.tsx',
  'app/admin/(dashboard)/wallet/page.tsx',

  // Client Dashboard
  'app/client/garage/page.tsx',
  'app/client/invoices/page.tsx',
  'app/client/new-rfq/page.tsx',
  'app/client/orders/page.tsx',
  'app/client/orders/orders-client.tsx',
  'app/client/rfq/[rfqId]/page.tsx',
  'app/client/wallet/page.tsx',

  // Vendor Dashboard
  'app/vendor/invoices/page.tsx',
  'app/vendor/quote/[rfqId]/page.tsx',
  'app/vendor/wallet/page.tsx',

  // Courier Dashboard
  'app/courier/invoices/page.tsx',
  'app/courier/wallet/page.tsx',

  // Profile, Auth & Deal pages
  'app/profile/page.tsx',
  'app/auth/signup/page.tsx',
  'app/deal/[orderId]/deal-page-client.tsx',
];

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING UPDATES TO PRODUCTION SERVER');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Directory: /var/www/rfq');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (root@147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected successfully!\n');

    // 2. Authorize local SSH key on the server
    try {
      const pubKeyPath = 'C:\\Users\\Administrator\\.ssh\\id_rsa.pub';
      if (fs.existsSync(pubKeyPath)) {
        const pubKey = fs.readFileSync(pubKeyPath, 'utf-8').trim();
        await ssh.execCommand(`mkdir -p /root/.ssh && chmod 700 /root/.ssh && grep -qF "${pubKey}" /root/.ssh/authorized_keys 2>/dev/null || echo "${pubKey}" >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys`);
        console.log('🔑 Local SSH key verified/added to authorized_keys.\n');
      }
    } catch (keyErr) {
      console.warn('Key setup notice:', keyErr.message);
    }

    const projectRoot = path.join(__dirname, '..');
    const remoteRoot = '/var/www/rfq';

    // 3. Ensure remote parent directories exist and upload files
    console.log(`2️⃣ Syncing ${FILES_TO_SYNC.length} files to ${remoteRoot}...`);
    let count = 0;
    for (const relPath of FILES_TO_SYNC) {
      const localFile = path.join(projectRoot, relPath);
      const remoteFile = path.posix.join(remoteRoot, relPath.replace(/\\/g, '/'));

      if (!fs.existsSync(localFile)) {
        console.warn(`⚠️ Warning: local file not found: ${relPath}`);
        continue;
      }

      const remoteDir = path.posix.dirname(remoteFile);
      await ssh.execCommand(`mkdir -p "${remoteDir}"`);
      await ssh.putFile(localFile, remoteFile);
      count++;
      process.stdout.write(`   [${count}/${FILES_TO_SYNC.length}] ✓ ${relPath}\n`);
    }
    console.log(`\n✅ All ${count} files transferred successfully!\n`);

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: remoteRoot });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) {
          console.error('STDERR:', res.stderr);
        } else {
          console.log('NOTICE:', res.stderr);
        }
      }
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    // 4. Build Next.js on server
    console.log('3️⃣ Building Next.js production bundle on server...');
    await execute('npm run build', 'NEXT.JS BUILD');

    // 5. Restart PM2
    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 3s for service to initialize...');
    await new Promise((r) => setTimeout(r, 3000));

    // 6. Verification
    console.log('\n5️⃣ Health and HTTP Verification:');
    await execute('curl -s -I http://127.0.0.1:3002 | head -n 8', 'LOCAL HEALTH (127.0.0.1:3002)');
    await execute('curl -s -I https://rfqsa.tech | head -n 8', 'PUBLIC HTTPS DOMAIN (rfqsa.tech)');

    console.log('\n====================================================');
    console.log('🎉 FULL DEPLOYMENT TO PRODUCTION COMPLETED SUCCESSFULLY!');
    console.log('🌐 Server: 147.93.56.252');
    console.log('🔗 URL: https://rfqsa.tech');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ DEPLOYMENT FAILED:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
