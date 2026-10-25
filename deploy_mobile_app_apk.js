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

const localArchive = path.join(__dirname, 'mobile_app.tar.gz');
const remoteArchive = '/root/mobile_app.tar.gz';

console.log('🚀 Step 1: Packaging mobile_app into mobile_app.tar.gz...');
if (fs.existsSync(localArchive)) {
  fs.unlinkSync(localArchive);
}

try {
  execSync('tar -czf mobile_app.tar.gz --exclude="build" --exclude=".dart_tool" --exclude=".git" mobile_app', {
    cwd: __dirname,
    stdio: 'inherit',
  });
  console.log(`✅ Packaged archive size: ${(fs.statSync(localArchive).size / (1024 * 1024)).toFixed(2)} MB`);
} catch (e) {
  console.error('❌ Failed to package mobile_app:', e.message);
  process.exit(1);
}

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH!');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP Error:', err);
      conn.end();
      return;
    }

    console.log(`📦 Step 2: Uploading mobile_app.tar.gz to VPS...`);
    sftp.fastPut(localArchive, remoteArchive, (putErr) => {
      if (putErr) {
        console.error('❌ Upload Failed:', putErr);
        conn.end();
        return;
      }

      console.log('✅ Upload finished successfully!');

      const buildScript = `
set -e
echo "--------------------------------------------------------"
echo "🛠️ Preparing Clean Mobile App Build on VPS..."
echo "--------------------------------------------------------"

# Stop lingering java (Gradle) and dart background daemons
echo "🛑 Stopping lingering background daemons..."
killall -9 java 2>/dev/null || true
killall -9 dart 2>/dev/null || true
rm -rf /root/.kotlin
sleep 2

# Clean previous build directory completely
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

echo "📦 Running flutter pub get..."
flutter pub get

echo "🔨 Building Flutter APK (Release mode)..."
flutter build apk --release --no-tree-shake-icons --android-skip-build-dependency-validation

# Deploy APK to /var/www/rfq/public/rfq.apk
echo "🚀 Copying APK to /var/www/rfq/public/rfq.apk..."
mkdir -p /var/www/rfq/public
cp build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/rfq.apk
chmod 644 /var/www/rfq/public/rfq.apk

echo "🔍 Verifying deployed APK..."
ls -lh /var/www/rfq/public/rfq.apk
curl -I -k https://rfqsa.tech/rfq.apk || true

echo "--------------------------------------------------------"
echo "🎉 SUCCESS: rfq.apk is LIVE at https://rfqsa.tech/rfq.apk"
echo "--------------------------------------------------------"
`;

      console.log('⚙️ Executing build & deployment script on server...');
      conn.exec(buildScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Remote Execution Error:', execErr);
          conn.end();
          return;
        }

        stream.on('close', (code, signal) => {
          console.log(`\n✨ Build & deploy finished with exit code: ${code}`);
          conn.end();
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

conn.connect(config);
