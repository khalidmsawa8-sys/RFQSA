const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const config = {
  host: '147.93.123.69',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const archivePath = path.join(__dirname, 'rfq_deploy.tar.gz');
const remoteDir = '/var/www/rfq';
const remoteTar = '/var/www/rfq_deploy.tar.gz';

console.log('🚀 Starting automated VPS deployment to Ubuntu Server...');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH!');

  // 1. Upload rfq_deploy.tar.gz via SFTP
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP Error:', err);
      conn.end();
      return;
    }

    console.log('📦 Uploading codebase archive (rfq_deploy.tar.gz)...');
    sftp.fastPut(archivePath, remoteTar, (putErr) => {
      if (putErr) {
        console.error('❌ Upload Failed:', putErr);
        conn.end();
        return;
      }
      console.log('✅ Upload finished successfully!');

      // Execute remote build & setup commands
      const remoteScript = `
set -e
echo "------------------------------------------------"
echo "🛠️ Setting up environment in /var/www/rfq..."
echo "------------------------------------------------"

# 1. Create target dir & extract
mkdir -p ${remoteDir}
tar -xzf ${remoteTar} -C ${remoteDir}
rm -f ${remoteTar}

# 2. Install Node.js 20 LTS if missing
if ! command -v node &> /dev/null; then
  echo "📥 Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# 3. Install Nginx, PM2, Git, Build Tools
echo "📥 Installing Nginx & PM2..."
apt-get update -y
apt-get install -y nginx git build-essential
npm install -g pm2

# 4. Install Dependencies & Build Next.js App
cd ${remoteDir}
echo "📦 Installing Node dependencies..."
npm install --production=false

echo "🔨 Building Next.js Production Bundle..."
NEXT_PUBLIC_SUPABASE_URL=https://demo-rfq-marketplace.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.demo_key npm run build

# 5. Start / Restart PM2
echo "⚡ Starting PM2 Service..."
pm2 delete rfq || true
pm2 start npm --name "rfq" -- start -- -p 3002
pm2 save

# 6. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx Reverse Proxy..."
cat << 'EOF' > /etc/nginx/sites-available/rfq
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name srv1524612.hstgr.cloud 147.93.123.69 _;

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
echo "🎉 DEPLOYMENT COMPLETE! Platform is Live!"
echo "------------------------------------------------"
`;

      conn.exec(remoteScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Remote Execution Error:', execErr);
          conn.end();
          return;
        }

        stream.on('close', (code, signal) => {
          console.log(`\n✨ Remote process exited with code ${code}`);
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
  });
}).connect(config);
