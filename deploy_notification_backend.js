const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const localDir = __dirname;

const filesToUpload = [
  { local: 'lib/firebase-admin.ts', remote: '/var/www/rfq/lib/firebase-admin.ts' },
  { local: 'lib/notification-service.ts', remote: '/var/www/rfq/lib/notification-service.ts' },
  { local: 'app/api/v1/notifications/test-fcm/route.ts', remote: '/var/www/rfq/app/api/v1/notifications/test-fcm/route.ts' },
];

console.log('🚀 Syncing Notification Engine & Firebase Admin to VPS...');
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connected to VPS');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP Error:', err);
      conn.end();
      process.exit(1);
    }

    let uploaded = 0;
    filesToUpload.forEach((f) => {
      const localPath = path.join(localDir, f.local);
      const remoteDir = path.dirname(f.remote);

      conn.exec(`mkdir -p ${remoteDir}`, () => {
        sftp.fastPut(localPath, f.remote, (putErr) => {
          if (putErr) {
            console.error(`❌ Failed to upload ${f.local}:`, putErr);
          } else {
            console.log(`✅ Uploaded ${f.local} -> ${f.remote}`);
          }
          uploaded++;
          if (uploaded === filesToUpload.length) {
            console.log('🔄 Restarting PM2 process rfq...');
            conn.exec('cd /var/www/rfq && pm2 restart rfq', (pm2Err, stream) => {
              stream.on('data', (d) => process.stdout.write(d));
              stream.on('close', () => {
                console.log('🎉 Server sync and restart complete!');
                conn.end();
              });
            });
          }
        });
      });
    });
  });
}).connect(config);
