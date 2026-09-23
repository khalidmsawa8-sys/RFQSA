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
echo "=== /etc/nginx/sites-available/rfq ==="
cat /etc/nginx/sites-available/rfq || true

echo "=== /etc/nginx/sites-available/oskar ==="
cat /etc/nginx/sites-available/oskar || true
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end());
    stream.on('data', (d) => process.stdout.write(d.toString()));
  });
});

conn.connect(config);
