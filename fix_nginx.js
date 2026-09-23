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

  const fixScript = `
set -e

echo "1. Writing clean /etc/nginx/sites-available/rfq..."
cat << 'EOF' > /etc/nginx/sites-available/rfq
server {
    server_name rfqsa.tech www.rfqsa.tech;

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

    listen [::]:443 ssl;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/rfqsa.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rfqsa.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    listen [::]:80;
    server_name rfqsa.tech www.rfqsa.tech;
    return 301 https://$host$request_uri;
}
EOF

echo "2. Writing clean /etc/nginx/sites-available/oskar..."
cat << 'EOF' > /etc/nginx/sites-available/oskar
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 147.93.56.252 srv1868299.hstgr.cloud _;

    client_max_body_size 50M;
    root /var/www/oskar/oskar-platform;

    location ~* (sw.js|manifest.webmanifest|workbox.*.js)$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Clear-Site-Data '"cache", "storage"';
        return 404;
    }

    location ~* \.html$ {
        root /var/www/oskar/oskar-platform;
        try_files $uri =404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
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

echo "3. Linking sites in /etc/nginx/sites-enabled/..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rfq /etc/nginx/sites-enabled/rfq
ln -sf /etc/nginx/sites-available/oskar /etc/nginx/sites-enabled/oskar

echo "4. Testing and reloading Nginx..."
nginx -t
systemctl reload nginx
systemctl restart nginx

echo "5. Checking PM2 processes..."
pm2 restart rfq || (cd /var/www/rfq && pm2 start npm --name "rfq" -- start -- -p 3002)
pm2 save

echo "6. Testing local HTTPS response for rfqsa.tech..."
curl -I -k https://rfqsa.tech
curl -I -k https://www.rfqsa.tech
`;

  conn.exec(fixScript, (err, stream) => {
    if (err) {
      console.error('Error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code) => {
      console.log(`\n✨ Fixed nginx with exit code: ${code}`);
      conn.end();
    });
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
  });
});

conn.connect(config);
