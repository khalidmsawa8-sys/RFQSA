const path = require('path');
const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const localDir = __dirname;
const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS to sync backend files...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      process.exit(1);
    }

    const filesToSync = [
      { local: path.join(localDir, 'app', 'api', 'quotes', 'route.ts'), remote: '/var/www/rfq/app/api/quotes/route.ts' },
      { local: path.join(localDir, 'lib', 'brand-specialization.ts'), remote: '/var/www/rfq/lib/brand-specialization.ts' },
      { local: path.join(localDir, 'parity_test_runner.js'), remote: '/root/parity_test_runner.js' },
    ];

    let count = 0;
    filesToSync.forEach(({ local, remote }) => {
      sftp.fastPut(local, remote, (putErr) => {
        if (putErr) console.error(`fastPut error for ${remote}:`, putErr);
        else console.log(`✅ Uploaded ${remote}`);
        count++;
        if (count === filesToSync.length) {
          // Restart PM2
          console.log('🔄 Restarting PM2 rfq service...');
          conn.exec('cd /var/www/rfq && pm2 restart rfq', (execErr, stream) => {
            if (execErr) console.error('Restart error:', execErr);
            stream.on('close', () => {
              console.log('✅ PM2 restarted. Running test runner on VPS...');
              conn.exec('node /root/parity_test_runner.js', (tErr, tStream) => {
                tStream.on('close', (code) => {
                  conn.end();
                  process.exit(code || 0);
                });
                tStream.on('data', (d) => process.stdout.write(d.toString()));
                tStream.stderr.on('data', (d) => process.stderr.write(d.toString()));
              });
            });
            stream.on('data', (d) => process.stdout.write(d.toString()));
          });
        }
      });
    });
  });
});

conn.connect(config);
