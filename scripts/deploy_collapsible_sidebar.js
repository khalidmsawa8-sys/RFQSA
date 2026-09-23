const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING COLLAPSIBLE SIDEBAR & FLUID LAYOUT TO PRODUCTION');
  console.log('Server: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const projectRoot = path.join(__dirname, '..');
    const filesToUpload = [
      {
        local: path.join(projectRoot, 'components', 'dashboard-sidebar.tsx'),
        remote: '/var/www/rfq/components/dashboard-sidebar.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'layout.tsx'),
        remote: '/var/www/rfq/app/client/layout.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'layout.tsx'),
        remote: '/var/www/rfq/app/vendor/layout.tsx',
      },
      {
        local: path.join(projectRoot, 'components', 'admin', 'admin-sidebar-nav.tsx'),
        remote: '/var/www/rfq/components/admin/admin-sidebar-nav.tsx',
      },
      {
        local: path.join(projectRoot, 'components', 'admin', 'admin-dashboard-shell.tsx'),
        remote: '/var/www/rfq/components/admin/admin-dashboard-shell.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'layout.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/layout.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/client/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'invoices', 'page.tsx'),
        remote: '/var/www/rfq/app/client/invoices/page.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/wallet/page.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      if (fs.existsSync(f.local)) {
        console.log(`   Uploading: ${path.relative(projectRoot, f.local)} -> ${f.remote}`);
        await ssh.putFile(f.local, f.remote);
      } else {
        console.warn(`   ⚠️ File missing locally: ${f.local}`);
      }
    }
    console.log('✅ Files uploaded successfully!\n');

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: '/var/www/rfq' });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr) {
        if (res.code !== 0) {
          console.error('STDERR:', res.stderr);
        } else {
          console.log('LOG/NOTICE:', res.stderr);
        }
      }
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('3️⃣ Running Next.js build on VPS...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 3 seconds for server to be healthy...');
    await new Promise((r) => setTimeout(r, 3000));

    console.log('\n5️⃣ Checking live status and PM2...');
    await execute('pm2 status rfq', 'PM2 STATUS');
    await execute('curl -s -I http://127.0.0.1:3002/client | head -n 5', 'CLIENT ROUTE CHECK');
    await execute('curl -s -I http://127.0.0.1:3002/vendor | head -n 5', 'VENDOR ROUTE CHECK');
    await execute('curl -s -I http://127.0.0.1:3002/admin | head -n 5', 'ADMIN ROUTE CHECK');

    console.log('\n====================================================');
    console.log('🎉 COLLAPSIBLE SIDEBAR & FLUID LAYOUT DEPLOYED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deploy();
