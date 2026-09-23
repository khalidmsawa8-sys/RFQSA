const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to NEW VPS via SSH!');

  const cmd = `
set -e
echo "------------------------------------------------"
echo "🛠️ Fixing Nginx Default Server block for IP & all Hostnames..."
echo "------------------------------------------------"

# Create robust default Nginx site configuration covering IP and all domains
cat << 'EOF' > /etc/nginx/sites-available/rfq
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name rfqsa.tech www.rfqsa.tech srv1868299.hstgr.cloud 147.93.56.252 _;

    ssl_certificate /etc/letsencrypt/live/rfqsa.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rfqsa.tech/privkey.pem;

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
systemctl reload nginx

echo "------------------------------------------------"
echo "🎉 Nginx Fix Applied! IP & Domains connected!"
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
