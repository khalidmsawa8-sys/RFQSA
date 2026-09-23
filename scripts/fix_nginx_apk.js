const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixNginxAndPerms() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  console.log('Connected to VPS!');

  // 1. Copy the newest release APK from build folder to public destinations
  const copyScript = `
    mkdir -p /var/www/rfq/public/downloads
    
    APK_SRC=""
    if [ -f /var/www/rfq/mobile_app/build/app/outputs/flutter-apk/app-release.apk ]; then
      APK_SRC="/var/www/rfq/mobile_app/build/app/outputs/flutter-apk/app-release.apk"
    elif [ -f /root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk ]; then
      APK_SRC="/root/mobile_app_build/mobile_app/build/app/outputs/flutter-apk/app-release.apk"
    elif [ -f /var/www/rfq/mobile_app/build/app/outputs/apk/release/app-release.apk ]; then
      APK_SRC="/var/www/rfq/mobile_app/build/app/outputs/apk/release/app-release.apk"
    fi

    echo "Using APK Source: $APK_SRC"
    if [ -n "$APK_SRC" ]; then
      cp -f "$APK_SRC" /var/www/rfq/public/rfqsa-mobile-release.apk
      cp -f "$APK_SRC" /var/www/rfq/public/rfq.apk
      cp -f "$APK_SRC" /var/www/rfq/public/downloads/rfqsa-mobile-release.apk
      cp -f "$APK_SRC" /var/www/rfq/public/downloads/rfq.apk
      cp -f "$APK_SRC" /var/www/rfq/public/downloads/rfq-app.apk
      echo "Copied successfully!"
    fi

    chmod 755 /var /var/www /var/www/rfq /var/www/rfq/public /var/www/rfq/public/downloads
    chmod 644 /var/www/rfq/public/*.apk /var/www/rfq/public/downloads/*.apk
    chown -R root:root /var/www/rfq/public
  `;
  const copyRes = await ssh.execCommand(copyScript);
  console.log(copyRes.stdout, copyRes.stderr);

  // 2. Nginx configuration with exact alias locations for all names
  const nginxRfqConf = `
server {
    listen 80;
    listen [::]:80;
    server_name 147.93.56.252;

    client_max_body_size 50M;
    root /var/www/oskar/oskar-platform;

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

server {
    server_name rfqsa.tech www.rfqsa.tech;

    client_max_body_size 100M;

    # Direct high-speed download for Android APK
    location ~* \\.apk$ {
        root /var/www/rfq/public;
        add_header Content-Type application/vnd.android.package-archive;
        add_header Content-Disposition "attachment; filename=$uri";
        add_header Access-Control-Allow-Origin *;
        try_files $uri /downloads/$uri =404;
    }

    location /downloads/ {
        alias /var/www/rfq/public/downloads/;
        add_header Content-Type application/vnd.android.package-archive;
        add_header Access-Control-Allow-Origin *;
        try_files $uri =404;
    }

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
`;

  console.log('2. Writing Nginx config...');
  await ssh.execCommand(`cat << 'EOF' > /etc/nginx/sites-available/rfqsa.tech\n${nginxRfqConf}\nEOF`);
  await ssh.execCommand('ln -sf /etc/nginx/sites-available/rfqsa.tech /etc/nginx/sites-enabled/rfqsa.tech');
  
  console.log('3. Testing and reloading Nginx...');
  const testRes = await ssh.execCommand('nginx -t');
  console.log(testRes.stdout, testRes.stderr);

  if (testRes.code === 0) {
    await ssh.execCommand('systemctl reload nginx');
    console.log('✅ Nginx reloaded successfully!');
  }

  // 4. Verify downloads
  console.log('4. Verifying curl downloads...');
  const t1 = await ssh.execCommand('curl -I https://rfqsa.tech/rfqsa-mobile-release.apk');
  console.log('T1 (rfqsa-mobile-release.apk):\n', t1.stdout);

  const t2 = await ssh.execCommand('curl -I https://rfqsa.tech/rfq.apk');
  console.log('T2 (rfq.apk):\n', t2.stdout);

  process.exit(0);
}

fixNginxAndPerms().catch(console.error);
