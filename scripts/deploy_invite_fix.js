const { NodeSSH } = require('node-ssh');
const path = require('path');
const fs = require('fs');

const ssh = new NodeSSH();

async function deploy() {
  console.log('====================================================');
  console.log('🚀 DEPLOYING TEAM INVITATION & RBAC PERMISSIONS FIX (rfqsa.tech)');
  console.log('Host: 147.93.56.252');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting via SSH...');
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
        local: path.join(projectRoot, 'lib', 'rbac', 'permissions.ts'),
        remote: '/var/www/rfq/lib/rbac/permissions.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'rbac-guard.server.ts'),
        remote: '/var/www/rfq/lib/rbac/rbac-guard.server.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'invitation-service.ts'),
        remote: '/var/www/rfq/lib/rbac/invitation-service.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'lib', 'rbac', 'roles-service.ts'),
        remote: '/var/www/rfq/lib/rbac/roles-service.ts',
        dir: '/var/www/rfq/lib/rbac',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'team', 'invite', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/team/invite/route.ts',
        dir: '/var/www/rfq/app/api/v1/team/invite',
      },
      {
        local: path.join(projectRoot, 'app', 'api', 'v1', 'team', 'roles', 'route.ts'),
        remote: '/var/www/rfq/app/api/v1/team/roles/route.ts',
        dir: '/var/www/rfq/app/api/v1/team/roles',
      },
      {
        local: path.join(projectRoot, 'components', 'team', 'team-management-view.tsx'),
        remote: '/var/www/rfq/components/team/team-management-view.tsx',
        dir: '/var/www/rfq/components/team',
      },
      {
        local: path.join(projectRoot, 'app', 'client', 'roles', 'page.tsx'),
        remote: '/var/www/rfq/app/client/roles/page.tsx',
        dir: '/var/www/rfq/app/client/roles',
      },
      {
        local: path.join(projectRoot, 'app', 'vendor', 'roles', 'page.tsx'),
        remote: '/var/www/rfq/app/vendor/roles/page.tsx',
        dir: '/var/www/rfq/app/vendor/roles',
      },
    ];

    console.log('2️⃣ Ensuring remote directories exist...');
    const uniqueDirs = [...new Set(filesToUpload.map(f => f.dir))];
    for (const d of uniqueDirs) {
      await ssh.execCommand(`mkdir -p "${d}"`);
    }

    console.log('3️⃣ Uploading updated files to VPS...');
    for (const f of filesToUpload) {
      console.log(`   Uploading: ${path.relative(projectRoot, f.local)} -> ${f.remote}`);
      await ssh.putFile(f.local, f.remote);
    }
    console.log('✅ Files uploaded successfully!\n');

    console.log('4️⃣ Sanitizing organization_members_db.json on VPS...');
    const sanitizeScript = `
      const fs = require('fs');
      const file = '/var/www/rfq/data/organization_members_db.json';
      try {
        if (fs.existsSync(file)) {
          let members = JSON.parse(fs.readFileSync(file, 'utf8'));
          let modified = false;
          members = members.map(m => {
            // If demo client id was assigned to subordinate member, detach it
            if (m.user_id === 'client-demo-id' && m.role_id !== 'client_owner') {
              console.log('Detaching client-demo-id from member:', m.id, m.email, m.role_id);
              m.user_id = 'user_' + m.id;
              modified = true;
            }
            return m;
          });
          if (modified) {
            fs.writeFileSync(file, JSON.stringify(members, null, 2), 'utf8');
            console.log('Sanitized organization_members_db.json successfully');
          } else {
            console.log('organization_members_db.json is already clean');
          }
        }
      } catch (e) {
        console.error('Error sanitizing members:', e);
      }
    `;
    await ssh.execCommand(`node -e "${sanitizeScript.replace(/\n/g, ' ')}"`);

    console.log('5️⃣ Building Next.js application on VPS...');
    const buildRes = await ssh.execCommand('npm run build', { cwd: '/var/www/rfq' });
    console.log(buildRes.stdout);
    if (buildRes.code !== 0) {
      console.error('BUILD ERROR:', buildRes.stderr);
      process.exit(1);
    }

    console.log('6️⃣ Restarting PM2 process...');
    const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: '/var/www/rfq' });
    console.log(pm2Res.stdout || pm2Res.stderr);

    console.log('7️⃣ Testing live invite generation from VPS...');
    await new Promise(r => setTimeout(r, 3000));

    const testPayload = JSON.stringify({
      email: 'live_test_' + Date.now() + '@company.com',
      fullName: 'عبدالله القحطاني',
      phone: '0555123456',
      roleId: 'client_procurement_manager',
    });

    const testRes = await ssh.execCommand(
      `curl -s -X POST "http://127.0.0.1:3002/api/v1/team/invite" -H "Content-Type: application/json" -H "Cookie: rfq_session=client" -d '${testPayload}'`
    );
    console.log('\n--- VERIFICATION RESULT: POST /api/v1/team/invite (rfq_session=client) ---');
    console.log(testRes.stdout || testRes.stderr);

    console.log('\n====================================================');
    console.log('🎉 DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================');

    ssh.dispose();
  } catch (err) {
    console.error('Deployment error:', err);
    if (ssh) ssh.dispose();
    process.exit(1);
  }
}

deploy();
