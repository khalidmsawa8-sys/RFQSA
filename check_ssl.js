const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  const cmd = `
echo "=== CERTIFICATES ==="
certbot certificates || true

echo "=== SITES AVAILABLE ==="
ls -la /etc/nginx/sites-available/ || true
ls -la /etc/nginx/sites-enabled/ || true
ls -la /etc/nginx/conf.d/ || true

echo "=== LETSENCRYPT LIVE ==="
ls -la /etc/letsencrypt/live/ || true
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end());
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
});

conn.connect(config);
