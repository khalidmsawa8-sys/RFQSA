const { Client } = require('ssh2');

const config = {
  host: '147.93.123.69',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH!');

  const cmd = `
echo "=== PM2 STATUS & LOGS ==="
pm2 status
pm2 logs rfq --lines 30 --nostream

echo "=== NGINX LOGS ==="
tail -n 20 /var/log/nginx/error.log
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
