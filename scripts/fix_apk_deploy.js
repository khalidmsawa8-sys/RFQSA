const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  console.log('Connecting to VPS...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });
  console.log('Connected!');

  console.log('1. Searching for APKs...');
  const findRes = await ssh.execCommand('find /root /var/www -name "*.apk"');
  console.log('Found APKs:\n', findRes.stdout);

  console.log('2. Ensuring public directory exists...');
  await ssh.execCommand('mkdir -p /var/www/rfq/public/downloads');

  console.log('3. Copying APK to public destinations...');
  const copyCommands = `
    if [ -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk ]; then
      cp -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/rfqsa-mobile-release.apk
      cp -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/rfq.apk
      cp -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/downloads/rfqsa-mobile-release.apk
      cp -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk /var/www/rfq/public/downloads/rfq.apk
      chmod 644 /var/www/rfq/public/*.apk /var/www/rfq/public/downloads/*.apk
      echo "Files copied successfully!"
    else
      echo "Source APK not found in /root/mobile_app_build"
    fi
  `;
  const copyRes = await ssh.execCommand(copyCommands);
  console.log('Copy result:\n', copyRes.stdout, copyRes.stderr);

  console.log('4. Listing /var/www/rfq/public...');
  const lsRes = await ssh.execCommand('ls -la /var/www/rfq/public && ls -la /var/www/rfq/public/downloads');
  console.log(lsRes.stdout);

  console.log('5. Testing curl against domain and local Nginx...');
  const test1 = await ssh.execCommand('curl -I -k https://rfqsa.tech/rfqsa-mobile-release.apk');
  console.log('Test https://rfqsa.tech/rfqsa-mobile-release.apk:\n', test1.stdout || test1.stderr);

  const test2 = await ssh.execCommand('curl -I -k https://rfqsa.tech/rfq.apk');
  console.log('Test https://rfqsa.tech/rfq.apk:\n', test2.stdout || test2.stderr);

  const test3 = await ssh.execCommand('curl -I -k https://rfqsa.tech/downloads/rfqsa-mobile-release.apk');
  console.log('Test https://rfqsa.tech/downloads/rfqsa-mobile-release.apk:\n', test3.stdout || test3.stderr);

  process.exit(0);
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
