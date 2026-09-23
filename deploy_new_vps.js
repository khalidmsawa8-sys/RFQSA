const fs = require('fs');
const path = require('path');
const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const archivePath = path.join(__dirname, 'rfq_deploy.tar.gz');
const remoteDir = '/var/www/rfq';
const remoteTar = '/root/rfq_deploy.tar.gz';
const domain = 'rfqsa.tech';

console.log(`🚀 Starting automated VPS deployment to Server (${config.host})...`);

if (!fs.existsSync(archivePath)) {
  console.error(`❌ Archive not found: ${archivePath}`);
  process.exit(1);
}

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Connected to VPS via SSH!');

  // Upload rfq_deploy.tar.gz via SFTP
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP Error:', err);
      conn.end();
      return;
    }

    console.log(`📦 Uploading codebase archive (${(fs.statSync(archivePath).size / (1024 * 1024)).toFixed(2)} MB) to server...`);
    sftp.fastPut(archivePath, remoteTar, (putErr) => {
      if (putErr) {
        console.error('❌ Upload Failed:', putErr);
        conn.end();
        return;
      }
      console.log('✅ Upload finished successfully!');

      // Remote execution commands (PRESERVE data directory)
      const remoteScript = `
set -e
echo "------------------------------------------------"
echo "🛠️ Extracting files and preparing deployment..."
echo "------------------------------------------------"

mkdir -p ${remoteDir}
# Clean old source code to avoid stale bundles (Keep persistent data safe!)
rm -rf ${remoteDir}/app ${remoteDir}/components ${remoteDir}/lib ${remoteDir}/public ${remoteDir}/styles ${remoteDir}/hooks ${remoteDir}/backend ${remoteDir}/scripts ${remoteDir}/docs
tar -xzf ${remoteTar} -C ${remoteDir}
rm -f ${remoteTar}

echo "📦 Installing Node dependencies..."
cd ${remoteDir}
npm install --production=false

echo "🔨 Building Next.js Production Bundle..."
NEXT_PUBLIC_SUPABASE_URL=https://demo-rfq-marketplace.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbW8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.demo_key npm run build

echo "⚡ Restarting PM2 Application..."
pm2 restart rfq || pm2 start npm --name "rfq" -- start -- -p 3002
pm2 save

echo "🌐 Verifying Nginx & Reloading..."
ln -sf /etc/nginx/sites-available/rfq /etc/nginx/sites-enabled/rfq
nginx -t
systemctl reload nginx

echo "🔍 Checking application health..."
sleep 3
curl -I http://127.0.0.1:3002 || true
curl -I -k https://rfqsa.tech || true

echo "------------------------------------------------"
echo "🎉 DEPLOYMENT COMPLETE! Latest changes are LIVE!"
echo "------------------------------------------------"
`;

      console.log('⚙️ Executing remote build & reload commands...');
      conn.exec(remoteScript, (execErr, stream) => {
        if (execErr) {
          console.error('❌ Remote Execution Error:', execErr);
          conn.end();
          return;
        }

        stream.on('close', (code, signal) => {
          console.log(`\n✨ Remote deployment script finished with exit code: ${code}`);
          conn.end();
          process.exit(code || 0);
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
});

conn.on('error', (err) => {
  console.error('❌ SSH Connection Error:', err.message);
  process.exit(1);
});

conn.connect(config);
