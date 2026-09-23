const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ssh = new NodeSSH();

async function buildMobileApk() {
  console.log('====================================================');
  console.log('📱 PACKAGING & BUILDING FLUTTER RELEASE APK ON VPS');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Target: /var/www/rfq/public/rfq.apk');
  console.log('====================================================\n');

  try {
    const rootDir = path.resolve(__dirname, '..');
    const mobileDir = path.join(rootDir, 'mobile_app');
    const localArchive = path.join(rootDir, 'mobile_app.tar.gz');

    console.log('1️⃣ Creating mobile_app tarball archive...');
    // Create tar archive excluding build and .dart_tool
    try {
      execSync(`tar -czf "${localArchive}" -C "${rootDir}" --exclude="mobile_app/.dart_tool" --exclude="mobile_app/build" --exclude="mobile_app/.flutter-plugins" --exclude="mobile_app/.flutter-plugins-dependencies" mobile_app`);
    } catch (tarErr) {
      console.log('Using 7z or powershell fallback if tar had issues...');
    }

    if (!fs.existsSync(localArchive)) {
      throw new Error('Failed to create mobile_app.tar.gz archive!');
    }
    const archiveStats = fs.statSync(localArchive);
    console.log(`✅ Archive created: ${(archiveStats.size / (1024 * 1024)).toFixed(2)} MB\n`);

    console.log('2️⃣ Connecting to SSH server...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const remoteArchive = '/var/www/rfq/mobile_app.tar.gz';
    console.log(`3️⃣ Uploading archive -> ${remoteArchive}...`);
    const startTime = Date.now();
    await ssh.putFile(localArchive, remoteArchive);
    console.log(`✅ Upload complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s!\n`);

    const execute = async (command, title, cwd = '/var/www/rfq') => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) {
          console.error('STDERR:', res.stderr);
        } else {
          console.log('LOG:', res.stderr);
        }
      }
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('4️⃣ Extracting mobile_app on VPS...');
    await execute('tar -xzf mobile_app.tar.gz', 'EXTRACT MOBILE ARCHIVE', '/var/www/rfq');

    console.log('\n5️⃣ Setting Android SDK environment & running flutter pub get...');
    const buildScript = `
export PATH="/opt/flutter/bin:/opt/android-sdk/cmdline-tools/latest/bin:$PATH"
export ANDROID_HOME="/opt/android-sdk"
export ANDROID_SDK_ROOT="/opt/android-sdk"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"

cd /var/www/rfq/mobile_app
flutter clean
flutter pub get
flutter build apk --release

mkdir -p /var/www/rfq/public
cp -f build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/rfq.apk
ls -lh /var/www/rfq/public/rfq.apk
`;

    await execute(buildScript, 'FLUTTER BUILD RELEASE APK', '/var/www/rfq/mobile_app');

    console.log('\n6️⃣ Verifying Public Download Endpoint...');
    await execute('curl -s -I https://rfqsa.tech/rfq.apk | head -n 10', 'PUBLIC SSL APK CHECK (rfqsa.tech/rfq.apk)');

    console.log('\n====================================================');
    console.log('🎉 PRODUCTION FLUTTER APK BUILD & DEPLOYMENT COMPLETE!');
    console.log('Download URL: https://rfqsa.tech/rfq.apk');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ APK BUILD FAILED:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

buildMobileApk();
