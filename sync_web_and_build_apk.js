const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const localDir = __dirname;
const archiveName = 'mobile_app_deploy.tar.gz';
const localArchive = path.join(localDir, archiveName);

console.log('===============================================================');
console.log('🚀 UNIFIED SYNC & APK RELEASE BUILD: Web + Mobile Parity 1:1');
console.log('===============================================================');

// 1. Create clean local mobile_app archive
console.log('\n📦 Step 1: Packaging mobile_app into tar.gz (excluding build artifacts)...');
if (fs.existsSync(localArchive)) {
  fs.unlinkSync(localArchive);
}

try {
  execSync(`tar -czf "${archiveName}" --exclude="build" --exclude=".dart_tool" --exclude=".git" mobile_app`, {
    cwd: localDir,
    stdio: 'inherit',
  });
  console.log(`✅ Packaged archive size: ${(fs.statSync(localArchive).size / (1024 * 1024)).toFixed(2)} MB`);
} catch (e) {
  console.error('❌ Failed to create tar archive:', e.message);
  process.exit(1);
}

// 2. Connect via SSH
console.log('\n🌐 Step 2: Connecting to VPS server (147.93.56.252)...');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connection established!');

  conn.sftp(async (err, sftp) => {
    if (err) {
      console.error('❌ SFTP Init Error:', err);
      conn.end();
      process.exit(1);
    }

    // Helper to ensure remote directory exists
    const ensureRemoteDir = (remoteFilePath) => {
      const remoteDirPath = path.posix.dirname(remoteFilePath);
      return new Promise((resolve) => {
        conn.exec(`mkdir -p "${remoteDirPath}"`, (execErr, stream) => {
          if (execErr) return resolve();
          stream.on('close', () => resolve());
          stream.resume();
        });
      });
    };

    // Helper to upload single file
    const uploadFile = async (item) => {
      const lPath = path.join(localDir, item.local);
      if (!fs.existsSync(lPath)) {
        console.warn(`  ⚠️ Local file missing: ${item.local}`);
        return;
      }
      await ensureRemoteDir(item.remote);
      return new Promise((resolve) => {
        sftp.fastPut(lPath, item.remote, (putErr) => {
          if (putErr) {
            console.error(`  ❌ Failed to sync ${item.local}:`, putErr.message);
          } else {
            console.log(`  ✅ Synced ${item.local}`);
          }
          resolve();
        });
      });
    };

    // Upload web backend changes
    console.log('\n🔄 Step 3: Syncing updated Web & API files to VPS...');
    const filesToSync = [
      { local: 'lib/image-storage.ts', remote: '/var/www/rfq/lib/image-storage.ts' },
      { local: 'lib/notification-service.ts', remote: '/var/www/rfq/lib/notification-service.ts' },
      { local: 'app/api/v1/support/route.ts', remote: '/var/www/rfq/app/api/v1/support/route.ts' },
      { local: 'app/api/v1/support/[id]/messages/route.ts', remote: '/var/www/rfq/app/api/v1/support/[id]/messages/route.ts' },
      { local: 'app/api/v1/orders/[id]/status/route.ts', remote: '/var/www/rfq/app/api/v1/orders/[id]/status/route.ts' },
      { local: 'app/api/v1/orders/[id]/route.ts', remote: '/var/www/rfq/app/api/v1/orders/[id]/route.ts' },
      { local: 'app/api/v1/orders/route.ts', remote: '/var/www/rfq/app/api/v1/orders/route.ts' },
      { local: 'app/api/v1/client/orders/[id]/confirm-receipt/route.ts', remote: '/var/www/rfq/app/api/v1/client/orders/[id]/confirm-receipt/route.ts' },
      { local: 'app/api/v1/vendor/orders/[id]/status/route.ts', remote: '/var/www/rfq/app/api/v1/vendor/orders/[id]/status/route.ts' },
      { local: 'app/api/rfqs/route.ts', remote: '/var/www/rfq/app/api/rfqs/route.ts' },
      { local: 'app/api/rfqs/[id]/route.ts', remote: '/var/www/rfq/app/api/rfqs/[id]/route.ts' },
      { local: 'app/api/rfqs/[id]/reactivate/route.ts', remote: '/var/www/rfq/app/api/rfqs/[id]/reactivate/route.ts' },
      { local: 'app/api/quotes/route.ts', remote: '/var/www/rfq/app/api/quotes/route.ts' },
      { local: 'app/client/support/support-client.tsx', remote: '/var/www/rfq/app/client/support/support-client.tsx' },
      { local: 'app/client/support/[id]/page.tsx', remote: '/var/www/rfq/app/client/support/[id]/page.tsx' },
      { local: 'app/vendor/support/vendor-support-client.tsx', remote: '/var/www/rfq/app/vendor/support/vendor-support-client.tsx' },
      { local: 'app/vendor/support/[id]/page.tsx', remote: '/var/www/rfq/app/vendor/support/[id]/page.tsx' },
      { local: 'app/admin/(dashboard)/support/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/support/page.tsx' },
      { local: 'app/admin/(dashboard)/support/[id]/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/support/[id]/page.tsx' },
      { local: 'app/vendor/radar/page.tsx', remote: '/var/www/rfq/app/vendor/radar/page.tsx' },
      { local: 'app/vendor/orders/page.tsx', remote: '/var/www/rfq/app/vendor/orders/page.tsx' },
      { local: 'lib/brand-specialization.ts', remote: '/var/www/rfq/lib/brand-specialization.ts' },
      { local: 'lib/bounded-contexts/supplier/radar.matcher.ts', remote: '/var/www/rfq/lib/bounded-contexts/supplier/radar.matcher.ts' },
      { local: 'lib/supabase/client.ts', remote: '/var/www/rfq/lib/supabase/client.ts' },
      { local: 'lib/supabase/server.ts', remote: '/var/www/rfq/lib/supabase/server.ts' },
      { local: 'components/vendors-map/vendors-map-client.tsx', remote: '/var/www/rfq/components/vendors-map/vendors-map-client.tsx' },
      { local: 'app/api/v1/vendors/map/route.ts', remote: '/var/www/rfq/app/api/v1/vendors/map/route.ts' },
      { local: 'app/api/v1/vendors/[id]/route.ts', remote: '/var/www/rfq/app/api/v1/vendors/[id]/route.ts' },
      { local: 'lib/vendor-branches.ts', remote: '/var/www/rfq/lib/vendor-branches.ts' },
      { local: 'data/vendor_branches_db.json', remote: '/var/www/rfq/data/vendor_branches_db.json' },
      { local: 'lib/system-settings.ts', remote: '/var/www/rfq/lib/system-settings.ts' },
      { local: 'components/quote-details-inspection-modal.tsx', remote: '/var/www/rfq/components/quote-details-inspection-modal.tsx' },
      { local: 'lib/courier-service.ts', remote: '/var/www/rfq/lib/courier-service.ts' },
      { local: 'app/api/v1/admin/support/[id]/route.ts', remote: '/var/www/rfq/app/api/v1/admin/support/[id]/route.ts' },
      { local: 'app/vendor/orders/orders-client.tsx', remote: '/var/www/rfq/app/vendor/orders/orders-client.tsx' },
      { local: 'app/deal/[orderId]/deal-page-client.tsx', remote: '/var/www/rfq/app/deal/[orderId]/deal-page-client.tsx' },
      { local: 'app/client/orders/orders-client.tsx', remote: '/var/www/rfq/app/client/orders/orders-client.tsx' },
      { local: 'components/invoice-pdf-export.tsx', remote: '/var/www/rfq/components/invoice-pdf-export.tsx' },
      { local: 'components/quote-pdf-export.tsx', remote: '/var/www/rfq/components/quote-pdf-export.tsx' },
      { local: 'components/vendor-details-modal.tsx', remote: '/var/www/rfq/components/vendor-details-modal.tsx' },
      { local: 'components/date-range-filter.tsx', remote: '/var/www/rfq/components/date-range-filter.tsx' },
      { local: 'lib/excel-export.ts', remote: '/var/www/rfq/lib/excel-export.ts' },
      { local: 'app/admin/(dashboard)/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/page.tsx' },
      { local: 'app/admin/(dashboard)/orders/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/orders/page.tsx' },
      { local: 'app/admin/(dashboard)/invoices/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/invoices/page.tsx' },
      { local: 'app/admin/(dashboard)/wallet/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/wallet/page.tsx' },
      { local: 'app/api/v1/admin/export/orders/route.ts', remote: '/var/www/rfq/app/api/v1/admin/export/orders/route.ts' },
      { local: 'app/api/v1/admin/export/invoices/route.ts', remote: '/var/www/rfq/app/api/v1/admin/export/invoices/route.ts' },
      { local: 'app/api/v1/admin/export/wallet/route.ts', remote: '/var/www/rfq/app/api/v1/admin/export/wallet/route.ts' },
      { local: 'app/api/v1/admin/audit/route.ts', remote: '/var/www/rfq/app/api/v1/admin/audit/route.ts' },
      { local: 'app/admin/(dashboard)/audit/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/audit/page.tsx' },
      { local: 'app/profile/page.tsx', remote: '/var/www/rfq/app/profile/page.tsx' },
      { local: 'lib/bounded-contexts/fleet/fleet.import.ts', remote: '/var/www/rfq/lib/bounded-contexts/fleet/fleet.import.ts' },
      { local: 'lib/bounded-contexts/fleet/fleet.repository.ts', remote: '/var/www/rfq/lib/bounded-contexts/fleet/fleet.repository.ts' },
      { local: 'components/fleet/vehicle-import-modal.tsx', remote: '/var/www/rfq/components/fleet/vehicle-import-modal.tsx' },
      { local: 'app/admin/(dashboard)/notifications/page.tsx', remote: '/var/www/rfq/app/admin/(dashboard)/notifications/page.tsx' },
      { local: 'app/api/v1/admin/notifications/route.ts', remote: '/var/www/rfq/app/api/v1/admin/notifications/route.ts' },
    ];

    for (const file of filesToSync) {
      await uploadFile(file);
    }

    // Upload mobile archive
    console.log('\n📤 Step 4: Uploading mobile_app archive to VPS (/root/mobile_app.tar.gz)...');
    sftp.fastPut(localArchive, '/root/mobile_app.tar.gz', (uploadErr) => {
      if (uploadErr) {
        console.error('❌ Upload Failed:', uploadErr);
        conn.end();
        process.exit(1);
      }

      console.log('✅ Mobile App Archive uploaded successfully!');

      // 3. Execute Build Script on VPS
      console.log('\n🔨 Step 5: Executing Flutter Release Build on VPS...');

      const buildScript = `
set -e

# Rebuild Web Next.js to compile updated API routes
cd /var/www/rfq
echo "🏗️ Building Next.js Web App on VPS..."
npm run build
pm2 restart rfq || true

# Extract Mobile App
echo "📦 Extracting mobile app archive..."
rm -rf /root/mobile_app_build
mkdir -p /root/mobile_app_build
tar -xzf /root/mobile_app.tar.gz -C /root/mobile_app_build/
rm -f /root/mobile_app.tar.gz

# Environment paths
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export FLUTTER_HOME=/opt/flutter
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$FLUTTER_HOME/bin:$PATH

git config --global --add safe.directory $FLUTTER_HOME || true
flutter config --no-analytics
flutter config --android-sdk $ANDROID_HOME

cd /root/mobile_app_build/mobile_app

echo "🧹 Running flutter clean & pub get..."
flutter clean || true
flutter pub get

echo "⚙️ Running flutter build apk --release..."
flutter build apk --release --no-tree-shake-icons --android-skip-build-dependency-validation

# Deploy to Web root
echo "🚀 Deploying APK to /var/www/rfq/public/rfq.apk..."
mkdir -p /var/www/rfq/public
cp build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/rfq.apk
chmod 644 /var/www/rfq/public/rfq.apk

echo "🔍 Verifying Deployed APK..."
ls -lh /var/www/rfq/public/rfq.apk
curl -I -k https://rfqsa.tech/rfq.apk

echo "==============================================================="
echo "🎉 SUCCESS: rfq.apk is LIVE at https://rfqsa.tech/rfq.apk"
echo "==============================================================="
`;

      conn.exec(buildScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Build Execution Error:', execErr);
          conn.end();
          process.exit(1);
        }

        stream.on('close', (code, signal) => {
          console.log(`\n🏁 Build process exited with code: ${code}`);
          conn.end();
          if (code === 0) {
            console.log('✅ ALL OPERATIONS COMPLETED SUCCESSFULLY!');
          } else {
            console.error('❌ Build script failed with non-zero exit code.');
          }
          process.exit(code || 0);
        });

        stream.on('data', (data) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ SSH Connection Error:', err);
  process.exit(1);
});

conn.connect(config);
