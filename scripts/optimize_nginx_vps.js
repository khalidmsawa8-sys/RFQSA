const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const script = `
# 1. Enable Gzip in /etc/nginx/nginx.conf
sed -i 's/# gzip_vary on;/gzip_vary on;/' /etc/nginx/nginx.conf
sed -i 's/# gzip_proxied any;/gzip_proxied any;/' /etc/nginx/nginx.conf
sed -i 's/# gzip_comp_level 6;/gzip_comp_level 6;/' /etc/nginx/nginx.conf
sed -i 's/# gzip_buffers 16 8k;/gzip_buffers 16 8k;/' /etc/nginx/nginx.conf
sed -i 's/# gzip_http_version 1.1;/gzip_http_version 1.1;/' /etc/nginx/nginx.conf
sed -i 's/# gzip_types /gzip_types /' /etc/nginx/nginx.conf

# Check if gzip_types includes json and all web types
grep -q "gzip_types" /etc/nginx/nginx.conf || sed -i '/gzip on;/a \	gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/x-javascript image/svg+xml;' /etc/nginx/nginx.conf

# 2. Test Nginx config & reload
nginx -t && systemctl reload nginx
echo "✅ Nginx Gzip Enabled & Reloaded!"
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected. Optimizing Nginx on VPS...');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Nginx reload finished with code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
