const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected.');
  conn.exec(`
    ls -lh /var/www/rfq/data/
    echo "=== Large files in /var/www/rfq/data/ ==="
    du -sh /var/www/rfq/data/*
    echo "=== Nginx Gzip Status ==="
    grep -i "gzip" /etc/nginx/nginx.conf /etc/nginx/sites-enabled/* 2>/dev/null || true
  `, (err, stream) => {
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
