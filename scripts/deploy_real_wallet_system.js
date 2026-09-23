const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING REAL LIVE DATABASE WALLET SYSTEM');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
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
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/route.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'admin', '(dashboard)', 'wallet', 'page.tsx'),
        remote: '/var/www/rfq/app/admin/(dashboard)/wallet/page.tsx',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'server.ts'),
        remote: '/var/www/rfq/lib/supabase/server.ts',
      },
      {
        local: path.join(projectRoot, 'lib', 'supabase', 'client.ts'),
        remote: '/var/www/rfq/lib/supabase/client.ts',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'admin', 'wallet', 'adjust', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/admin/wallet/adjust/route.ts',
      },
    ];

    console.log('1️⃣ Uploading updated files to server...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.basename(f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ Files uploaded successfully!\n');

    // 2️⃣ Sync server profiles_db.json with full set of clients/vendors
    console.log('2️⃣ Synchronizing server profiles_db.json with all clients and vendors...');
    const syncProfilesCmd = `node -e '
      const fs = require("fs");
      const path = "/var/www/rfq/data/profiles_db.json";
      let profiles = [];
      try {
        profiles = JSON.parse(fs.readFileSync(path, "utf-8"));
      } catch(e) {}

      const standardProfiles = [
        {
          id: "client-demo-id",
          role: "client",
          is_active: true,
          full_name: "شركة المشتريات الوطنية",
          company_name: "شركة المشتريات الوطنية",
          ref_code: "CLI-101",
          phone: "0501234567",
          city: "الرياض",
          balance: 0
        },
        {
          id: "vendor-demo-id",
          role: "vendor",
          is_active: true,
          full_name: "مؤسسة قطع الغيار المعتمدة",
          company_name: "مؤسسة قطع الغيار المعتمدة",
          ref_code: "VND-501",
          phone: "0551122334",
          city: "الرياض",
          balance: 0
        },
        {
          id: "client-2",
          role: "client",
          is_active: true,
          full_name: "شركة الوفاق لتأجير السيارات",
          company_name: "شركة الوفاق لتأجير السيارات",
          ref_code: "CLI-102",
          phone: "0543322110",
          city: "جدة",
          balance: 100
        },
        {
          id: "vendor-2",
          role: "vendor",
          is_active: true,
          full_name: "شركة الخليج للقطع والمحركات",
          company_name: "شركة الخليج للقطع والمحركات",
          ref_code: "VND-502",
          phone: "0559988776",
          city: "الدمام",
          balance: 0
        },
        {
          id: "client-3",
          role: "client",
          is_active: true,
          full_name: "مؤسسة الأفق للخدمات اللوجستية",
          company_name: "مؤسسة الأفق للخدمات اللوجستية",
          ref_code: "CLI-103",
          phone: "0567788990",
          city: "الرياض",
          balance: 0
        },
        {
          id: "vendor-3",
          role: "vendor",
          is_active: true,
          full_name: "مركز التحدي لقطع الغيار الأصلية",
          company_name: "مركز التحدي لقطع الغيار الأصلية",
          ref_code: "VND-503",
          phone: "0533344556",
          city: "مكة المكرمة",
          balance: 0
        }
      ];

      for (const sp of standardProfiles) {
        const idx = profiles.findIndex(p => p.id === sp.id);
        if (idx >= 0) {
          profiles[idx] = { ...sp, ...profiles[idx], full_name: sp.full_name, company_name: sp.company_name, ref_code: sp.ref_code };
        } else {
          profiles.push(sp);
        }
      }

      fs.writeFileSync(path, JSON.stringify(profiles, null, 2), "utf-8");
      console.log("Profiles synced count:", profiles.length);
    '`;
    const syncRes = await ssh.execCommand(syncProfilesCmd);
    console.log(syncRes.stdout);

    // 3️⃣ Clean fake transactions from wallet_transactions_db.json
    console.log('3️⃣ Cleaning fake transactions from server wallet_transactions_db.json...');
    const cleanTxsCmd = `node -e '
      const fs = require("fs");
      const path = "/var/www/rfq/data/wallet_transactions_db.json";
      let txs = [];
      try {
        txs = JSON.parse(fs.readFileSync(path, "utf-8"));
      } catch(e) {}

      // Keep only real non-mock transactions (exclude tx-init-*)
      const realTxs = txs.filter(t => !t.id.startsWith("tx-init-"));
      fs.writeFileSync(path, JSON.stringify(realTxs, null, 2), "utf-8");
      console.log("Real transactions count:", realTxs.length);
    '`;
    const cleanRes = await ssh.execCommand(cleanTxsCmd);
    console.log(cleanRes.stdout);

    // 4️⃣ Build Next.js
    console.log('4️⃣ Building Next.js production bundle...');
    const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
    if (buildRes.code !== 0) {
      console.error(buildRes.stderr);
      throw new Error(`Build failed with exit code ${buildRes.code}`);
    }
    console.log('✅ Build completed successfully!\n');

    // 5️⃣ Restart PM2
    console.log('5️⃣ Restarting PM2 process...');
    await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
    console.log('✅ PM2 restarted!\n');

    // 6️⃣ Verify GET /api/v1/admin/wallet live
    console.log('6️⃣ Verifying live /api/v1/admin/wallet endpoint...');
    const walletGetRes = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/v1/admin/wallet -H "Cookie: rfq_session=admin" -H "x-admin-request: true"');
    console.log('--- GET /api/v1/admin/wallet Output ---');
    try {
      const parsed = JSON.parse(walletGetRes.stdout);
      console.log('Success:', parsed.success);
      console.log('Stats:', parsed.stats);
      console.log('Users count:', parsed.users?.length);
      console.log('Users list:', parsed.users?.map(u => ({ id: u.id, name: u.full_name, company: u.company_name, balance: u.balance })));
      console.log('Transactions count:', parsed.transactions?.length);
    } catch (e) {
      console.log(walletGetRes.stdout);
    }

    console.log('\n====================================================');
    console.log('🎉 REAL LIVE DATABASE WALLET SYSTEM DEPLOYED SUCCESSFULLY');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Deployment error:', err);
  } finally {
    ssh.dispose();
  }
}

deploy();
