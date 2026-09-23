const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('🔨 Connected to VPS. Running npm run build & restarting PM2...');

  conn.exec('cd /var/www/rfq && npm run build && pm2 restart rfq', (err, stream) => {
    if (err) {
      console.error('exec error:', err);
      process.exit(1);
    }

    stream.on('close', (code) => {
      console.log('🏁 Next.js build completed with code:', code);
      conn.end();
      process.exit(code || 0);
    });

    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
});

conn.connect(config);
