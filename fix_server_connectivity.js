const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH!');

  const cmd = `
echo "=== 1. Checking Firewall (UFW) ==="
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow 22/tcp || true
ufw allow 'Nginx Full' || true
ufw status || true

echo "=== 2. Kill Hanging Certbot Processes ==="
killall -9 certbot || true
rm -f /tmp/certbot* /var/log/letsencrypt/letsencrypt.log.* || true

echo "=== 3. Create SSL Certificates Directory & Fallback Cert ==="
mkdir -p /etc/ssl/certs /etc/ssl/private
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/rfqsa-fallback.key \
  -out /etc/ssl/certs/rfqsa-fallback.crt \
  -subj "/CN=rfqsa.tech" || true

echo "=== 4. Configure Nginx with HTTP and HTTPS ==="
cat << 'EOF' > /etc/nginx/sites-available/rfq
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name rfqsa.tech www.rfqsa.tech srv1868299.hstgr.cloud 147.93.56.252 _;

    ssl_certificate /etc/ssl/certs/rfqsa-fallback.crt;
    ssl_certificate_key /etc/ssl/private/rfqsa-fallback.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/rfq /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=== 5. Run Certbot for Real Trusted SSL (Let's Encrypt) ==="
certbot --nginx -d rfqsa.tech -d www.rfqsa.tech --non-interactive --agree-tos --email admin@rfqsa.tech --redirect || echo "Certbot attempt completed."

nginx -t
systemctl reload nginx

echo "=== 6. Status of Nginx and Ports ==="
systemctl status nginx --no-pager
ss -tulpn | grep -E ':(80|443|3002)'
pm2 status

echo "=== 7. Test Local Curl ==="
curl -I http://127.0.0.1:80
curl -I http://127.0.0.1:3002
`;

  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log(`\n✨ Finished with code ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
