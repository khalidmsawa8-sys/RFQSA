const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deployClientFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING CLIENT DASHBOARD & BROWSER LOOP FIX');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server...');
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
        local: path.join(projectRoot, 'lib', 'supabase', 'client.ts'),
        remote: '/var/www/rfq/lib/supabase/client.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'server.ts'),
        remote: '/var/www/rfq/lib/supabase/server.ts',
      },
      {
        local: path.join(projectRoot, 'components', 'dashboard', 'slide-dashboard.tsx'),
        remote: '/var/www/rfq/components/dashboard/slide-dashboard.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'adjust', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/adjust/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/wallet/page.tsx',
      },
    ];

    console.log('2️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.basename(f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
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
      return res;
    };

    console.log('3️⃣ Building Next.js production bundle on server...');
    const buildRes = await execute('npm run build', 'Next.js Build');
    if (buildRes.code !== 0) {
      throw new Error(`Build failed with exit code ${buildRes.code}`);
    }

    console.log('4️⃣ Restarting PM2 process...');
    await execute('pm2 restart rfq', 'PM2 Restart');

    console.log('\n5️⃣ Testing /client endpoint response...');
    const clientTest = await execute(
      'curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3002/client" -H "Cookie: rfq_session=client"',
      'Verify /client HTTP status'
    );
    console.log(`Status Code for /client: ${clientTest.stdout.trim()}`);

    console.log('\n====================================================');
    console.log('🎉 CLIENT DASHBOARD FIX DEPLOYED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
  } finally {
    ssh.dispose();
  }
}

deployClientFix();
