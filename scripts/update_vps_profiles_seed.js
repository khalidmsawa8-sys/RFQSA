const { NodeSSH } = require('node-ssh');
const fs = require('fs');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  console.log('Connected to VPS. Uploading update script...');

  const remoteScript = `
const fs = require('fs');
const path = '/var/www/rfq/data/profiles_db.json';
const profiles = JSON.parse(fs.readFileSync(path, 'utf-8'));

const baseDate = new Date('2026-08-01T08:00:00.000Z');

const updated = profiles.map((p, idx) => {
  const seedDate = new Date(baseDate.getTime() + (idx * 3.2 * 24 * 60 * 60 * 1000)).toISOString();

  if (p.id === 'admin-demo-id' || p.role === 'admin' || p.is_admin === true) {
    return {
      ...p,
      role: 'admin',
      is_admin: true,
      admin_role: 'super_admin',
      role_id: p.role_id || 'platform_super_admin',
      ref_code: 'ADM-001',
      created_at: p.created_at || '2026-08-01T08:00:00.000Z',
      company_name: p.company_name || 'إدارة منصة رِفق',
    };
  }

  let refCode = p.ref_code;
  if (!refCode || refCode === '-') {
    if (p.role === 'vendor') refCode = 'SUP-' + (50000 + idx);
    else if (p.role === 'courier') refCode = 'COU-' + (70000 + idx);
    else refCode = 'CUST-' + (10000 + idx);
  }

  return {
    ...p,
    ref_code: refCode,
    created_at: p.created_at || seedDate,
  };
});

fs.writeFileSync(path, JSON.stringify(updated, null, 2), 'utf-8');
console.log('SUCCESS: Updated ' + updated.length + ' profiles in ' + path);
console.table(updated.map(x => ({ id: x.id, role: x.role, is_admin: x.is_admin, ref_code: x.ref_code, created_at: x.created_at })));
`;

  await ssh.execCommand(`cat << 'EOF' > /tmp/update_profiles.js\n${remoteScript}\nEOF`);
  const res = await ssh.execCommand('node /tmp/update_profiles.js');
  console.log(res.stdout);
  if (res.stderr) console.error('stderr:', res.stderr);

  ssh.dispose();
}

main().catch(console.error);
