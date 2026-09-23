const { NodeSSH } = require('node-ssh');

async function inspect() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });

    const script = `
const fs = require('fs');
const envContent = fs.readFileSync('/var/www/rfq/.env.local', 'utf8');
const env = {};
envContent.split('\\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function query(endpoint) {
  const res = await fetch(url + '/rest/v1/' + endpoint, {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
    }
  });
  return await res.json();
}

(async () => {
  const profiles = await query('profiles?select=id,full_name,email,role,phone,is_admin,created_at,ref_code');
  const rfqs = await query('rfqs?select=id,status,created_at,expires_at');
  const orders = await query('orders?select=id,status,total_price,created_at');
  console.log('Profiles Count:', profiles.length);
  console.log('Profiles Sample:', JSON.stringify(profiles.slice(0, 5), null, 2));
  console.log('RFQs Count:', rfqs.length);
  console.log('Orders Count:', orders.length);
})();
`;

    await ssh.execCommand("cat << 'EOF' > /var/www/rfq/scripts/query_db.js\n" + script + "\nEOF");
    const res = await ssh.execCommand('node /var/www/rfq/scripts/query_db.js', { cwd: '/var/www/rfq' });
    console.log(res.stdout || res.stderr);

  } catch (err) {
    console.error(err);
  } finally {
    ssh.dispose();
  }
}

inspect();
