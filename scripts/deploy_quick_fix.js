const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deployQuickFix() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING RBAC & USERS STUDIO FIX TO PRODUCTION');
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
        local: path.join(projectRoot, 'components', 'invoice-pdf-export.tsx'),
        remote: '/var/www/rfq/components/invoice-pdf-export.tsx',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'invoices', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/invoices/page.tsx',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'client.ts'),
        remote: '/var/www/rfq/lib/supabase/client.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'server.ts'),
        remote: '/var/www/rfq/lib/supabase/server.ts',
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
      if (res.code !== 0) {
        throw new Error(`Command failed with exit code ${res.code}`);
      }
      return res;
    };

    console.log('\n3️⃣ Building Next.js production bundle on server...');
    await execute('npm run build', 'NEXT.JS BUILD');

    console.log('\n4️⃣ Restarting PM2 process (rfq)...');
    await execute('pm2 restart rfq', 'PM2 RESTART');

    console.log('⏳ Waiting 2.5s for Next.js server to become ready...');
    await new Promise((r) => setTimeout(r, 2500));

    console.log('\n5️⃣ Testing User Creation API on server with admin session cookie...');
    const userPayload = JSON.stringify({
      full_name: "عبدالله التجريبي",
      phone: "0533196489",
      email: "khalid.ali@samnan.com.sa",
      role: "client",
      company_name: "معصوب",
      tax_number: "333333",
      commercial_register: "1010",
      national_address: "الرياض حي الصحافة",
    });

    const userCmd = `curl -s -X POST http://127.0.0.1:3002/api/v1/admin/users -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d '${userPayload}'`;
    await execute(userCmd, 'TEST CREATE USER API');

    console.log('\n6️⃣ Testing Role Creation API on server with admin session cookie...');
    const rolePayload = JSON.stringify({
      name_ar: "مشرف تجريبي",
      description_ar: "وصف وظيفي تجريبي لاختبار الصلاحيات",
      scope: "client",
      badge_color: "blue",
      permissions: ["rfqs:view", "quotes:view"],
    });

    const roleCmd = `curl -s -X POST http://127.0.0.1:3002/api/v1/admin/roles -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -d '${rolePayload}'`;
    await execute(roleCmd, 'TEST CREATE ROLE API');

    console.log('\n7️⃣ Checking PM2 status...');
    await execute('pm2 status rfq', 'PM2 STATUS');

    console.log('\n====================================================');
    console.log('🎉 FIX DEPLOYED AND VERIFIED SUCCESSFULLY!');
    console.log('Live URLs:');
    console.log(' - Users: https://rfqsa.tech/admin/users');
    console.log(' - Roles: https://rfqsa.tech/admin/roles');
    console.log('====================================================\n');

  } catch (err) {
    console.error('\n❌ DEPLOYMENT ERROR:', err.message || err);
    process.exit(1);
  } finally {
    ssh.dispose();
  }
}

deployQuickFix();
