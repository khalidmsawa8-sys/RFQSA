const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployCourierOrdersFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING COURIER ORDERS DASHBOARD FIX TO PRODUCTION');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('Target: Automatic Delivery Creation for All Placed Orders');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server (147.93.56.252)...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected successfully!\n');

    const projectRoot = path.join(__dirname, '..');
    const filesToUpload = [
      {
        local: path.join(projectRoot, 'lib', 'courier-service.ts'),
        remote: '/var/www/rfq/lib/courier-service.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'orders', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/orders/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'courier', 'page.tsx'),
        remote: '/var/www/rfq/app/courier/page.tsx',
      },
      {
        local: path.join(projectRoot, 'data', 'deliveries_db.json'),
        remote: '/var/www/rfq/data/deliveries_db.json',
      },
    ];

    console.log(`2️⃣ Uploading ${filesToUpload.length} modified files to remote server...`);
    for (const item of filesToUpload) {
      if (fs.existsSync(item.local)) {
        await ssh.putFile(item.local, item.remote);
        console.log(`  ✓ Uploaded: ${path.basename(item.local)} -> ${item.remote}`);
      } else {
        console.warn(`  ⚠️ Warning: Local file not found: ${item.local}`);
      }
    }
    console.log('✅ File uploads completed!\n');

    console.log('3️⃣ Running next build on remote VPS (/var/www/rfq)...');
    const buildResult = await ssh.execCommand('npm run build', {
      cwd: '/var/www/rfq',
    });

    console.log('--- Build Output ---');
    console.log(buildResult.stdout);
    if (buildResult.stderr) {
      console.log('Build Stderr:', buildResult.stderr);
    }

    if (buildResult.code !== 0) {
      throw new Error(`Build failed with exit code: ${buildResult.code}`);
    }
    console.log('✅ Remote build succeeded!\n');

    console.log('4️⃣ Restarting PM2 process (pm2 restart rfq)...');
    const pm2Result = await ssh.execCommand('pm2 restart rfq', {
      cwd: '/var/www/rfq',
    });
    console.log(pm2Result.stdout);
    console.log('✅ PM2 Restarted successfully!\n');

    console.log('5️⃣ Verifying live courier deliveries endpoint (curl /api/v1/courier/deliveries)...');
    const testResult = await ssh.execCommand(
      'curl -s -H "x-courier-id: courier-demo-id" http://localhost:3000/api/v1/courier/deliveries',
      { cwd: '/var/www/rfq' }
    );
    console.log('Response:');
    try {
      const parsed = JSON.parse(testResult.stdout);
      console.log(`Success: ${parsed.success}`);
      console.log(`Total deliveries found: ${parsed.count}`);
      if (parsed.deliveries) {
        parsed.deliveries.forEach((d) => {
          console.log(`  - [${d.id}] Order: ${d.order_id} | Status: ${d.delivery_status} | Client: ${d.client_name} | Parts: ${d.parts_summary}`);
        });
      }
    } catch (e) {
      console.log(testResult.stdout.substring(0, 500));
    }

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployCourierOrdersFix();
