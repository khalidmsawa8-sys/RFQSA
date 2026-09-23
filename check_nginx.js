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
echo "=== NGINX SITES ENABLED ==="
ls -la /etc/nginx/sites-enabled/

echo "=== SITES AVAILABLE FOR MONJIZ / DEFAULT ==="
cat /etc/nginx/sites-enabled/*

echo "=== TESTING CURL ON LOCALHOST ==="
curl -I http://127.0.0.1:3002
curl -I http://127.0.0.1:80
curl -I -H "Host: srv1524612.hstgr.cloud" http://127.0.0.1:80
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
