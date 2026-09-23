const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH for diagnosis!');

  const cmd = `
echo "=== 1. PM2 LIST ==="
pm2 list

echo "=== 2. PM2 RFQ STATUS ==="
pm2 show rfq || true

echo "=== 3. PM2 LOGS RFQ ==="
pm2 logs rfq --lines 25 --nostream || true

echo "=== 4. LISTENING PORTS ==="
ss -tulpn | grep -E "node|nginx|300" || true

echo "=== 5. NGINX CONFIGS ==="
cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/* 2>/dev/null || true

echo "=== 6. CURL TESTS ==="
echo "Testing 127.0.0.1:3000:"
curl -I http://127.0.0.1:3000 || true

echo "Testing 127.0.0.1:3002:"
curl -I http://127.0.0.1:3002 || true

echo "Testing domain locally:"
curl -I -k https://rfqsa.tech || true
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Execution error:', err);
      conn.end();
      return;
    }

    stream.on('close', (code) => {
      console.log(`\n✨ Diagnosis finished with exit code: ${code}`);
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

conn.on('error', (err) => {
  console.error('SSH Connection error:', err);
});

conn.connect(config);
