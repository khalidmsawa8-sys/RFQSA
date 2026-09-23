const { NodeSSH } = require('node-ssh');

async function inspectWalletFlow() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Fetching Admin Wallet Users ---');
  const adminWalletRes = await ssh.execCommand(`curl -s "http://127.0.0.1:3002/api/v1/admin/wallet" \
    -H "Cookie: rfq_session=admin; rfq_role=admin" \
    -H "x-admin-request: true"`);

  try {
    const data = JSON.parse(adminWalletRes.stdout);
    console.log(`Found ${data.users?.length} users in admin wallet.`);
    console.log('First 5 users in admin wallet:');
    (data.users || []).slice(0, 5).forEach(u => {
      console.log(` - ID: ${u.id}, Name: ${u.full_name}, Ref: ${u.ref_code}, Balance: ${u.balance}, Role: ${u.role}`);
    });
  } catch (e) {
    console.error('Failed to parse admin wallet:', adminWalletRes.stdout.slice(0, 300));
  }

  console.log('\n--- 2. Checking Current Session Users for Client & Vendor ---');
  // Check client profile & vendor profile in profiles_db.json and organization_members_db.json
  const checkProfiles = await ssh.execCommand(`
    node -e "
      const fs = require('fs');
      const p = JSON.parse(fs.readFileSync('/var/www/rfq/data/profiles_db.json'));
      const m = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
      console.log('Total profiles:', p.length);
      p.forEach(x => console.log('Profile:', x.id, x.email, x.full_name, x.role, 'balance:', x.balance, 'wallet_balance:', x.wallet_balance));
      console.log('Total org members:', m.length);
      m.forEach(x => console.log('Member:', x.id, x.user_id, x.email, x.full_name, x.role_id, 'org:', x.organization_id));
    "
  `);
  console.log(checkProfiles.stdout);

  ssh.dispose();
}

inspectWalletFlow().catch(console.error);
