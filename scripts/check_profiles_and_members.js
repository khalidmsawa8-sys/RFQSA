const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const remoteScript = `
    const fs = require('fs');
    const env = fs.readFileSync('.env.local', 'utf8');
    const getVal = (k) => (env.match(new RegExp(k + '=(.+)')) || [])[1]?.trim();
    const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
    const key = getVal('SUPABASE_SERVICE_ROLE_KEY') || getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    async function query(table) {
      const res = await fetch(\`\${url}/rest/v1/\${table}?select=*\`, {
        headers: { apikey: key, Authorization: 'Bearer ' + key }
      });
      return await res.json();
    }

    (async () => {
      const p = await query('profiles');
      console.log('PROFILES:', JSON.stringify(p, null, 2));
      const m = await query('organization_members');
      console.log('MEMBERS:', JSON.stringify(m, null, 2));
    })();
  `;

  await ssh.execCommand(`cat << 'EOF' > /var/www/rfq/check_db.js\n${remoteScript}\nEOF`);
  const res = await ssh.execCommand('node check_db.js', { cwd: '/var/www/rfq' });
  await ssh.execCommand('rm -f /var/www/rfq/check_db.js');
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

check();
