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
cat << 'EOF' > /etc/nginx/sites-available/rfq
# 1. HTTPS Server Block (SSL)
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name rfqsa.tech www.rfqsa.tech srv1868299.hstgr.cloud 147.93.56.252 _;

    ssl_certificate /etc/letsencrypt/live/rfqsa.tech-0001/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rfqsa.tech-0001/privkey.pem;
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

# 2. HTTP Server Block (Redirect to HTTPS)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name rfqsa.tech www.rfqsa.tech srv1868299.hstgr.cloud 147.93.56.252 _;

    return 301 https://$host$request_uri;
}
EOF

ln -sf /etc/nginx/sites-available/rfq /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "✅ Clean HTTP to HTTPS redirect configured and Nginx reloaded!"
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
