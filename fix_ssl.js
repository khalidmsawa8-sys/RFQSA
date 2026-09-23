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
set -e
echo "------------------------------------------------"
echo "🔐 Setting up SSL & Port 443 / Port 80 for Hostinger domain..."
echo "------------------------------------------------"

# 1. Create self-signed certificate fallback
mkdir -p /etc/ssl/certs /etc/ssl/private
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
  -keyout /etc/ssl/private/nginx-selfsigned.key \\
  -out /etc/ssl/certs/nginx-selfsigned.crt \\
  -subj "/CN=srv1524612.hstgr.cloud" || true

# 2. Update Nginx rfq config for both HTTP & HTTPS
cat << 'EOF' > /etc/nginx/sites-available/rfq
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name srv1524612.hstgr.cloud 147.93.123.69 _;

    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;

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

nginx -t
systemctl reload nginx
echo "✅ Self-signed SSL configured on Port 443 & Port 80!"

# 3. Attempt Let's Encrypt Certbot SSL for real trusted SSL certificate
if command -v certbot &> /dev/null; then
  echo "🔒 Requesting official Let's Encrypt SSL certificate for srv1524612.hstgr.cloud..."
  certbot --nginx -d srv1524612.hstgr.cloud --non-interactive --agree-tos --email admin@rfq-marketplace.com || echo "Certbot skipped or domain rate limited."
  systemctl reload nginx
fi

echo "------------------------------------------------"
echo "🎉 SSL Fix Applied! HTTPS & HTTP now online!"
echo "------------------------------------------------"
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
