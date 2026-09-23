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
  console.log('✅ Connected to VPS to run parity_test_runner.js...');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      process.exit(1);
    }

    const localRunner = path.join(localDir, 'parity_test_runner.js');
    const remoteRunner = '/root/parity_test_runner.js';

    sftp.fastPut(localRunner, remoteRunner, (putErr) => {
      if (putErr) {
        console.error('fastPut error:', putErr);
        process.exit(1);
      }

      conn.exec('node /root/parity_test_runner.js', (execErr, stream) => {
        if (execErr) {
          console.error('exec error:', execErr);
          process.exit(1);
        }

        stream.on('close', (code) => {
          conn.end();
          process.exit(code || 0);
        });

        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      });
    });
  });
});

conn.connect(config);
