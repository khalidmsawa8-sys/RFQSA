const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH');
  conn.exec('which flutter || true; which java || true; which gradle || true; ls -la /var/www/rfq/public/ || true; df -h', (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code) => {
      conn.end();
    });
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
});

conn.connect(config);
