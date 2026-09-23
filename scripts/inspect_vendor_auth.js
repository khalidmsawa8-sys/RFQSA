const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function inspect() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- PROFILES_DB.JSON VENDOR RECORDS ---');
  const res1 = await ssh.execCommand('node -e "const p = require(\'./data/profiles_db.json\'); console.log(JSON.stringify(p.filter(x => x.role === \'vendor\' || x.email?.includes(\'vendor\')), null, 2))"', { cwd: '/var/www/rfq' });
  console.log(res1.stdout);

  console.log('--- ORGANIZATION_MEMBERS_DB.JSON VENDOR RECORDS ---');
  const res2 = await ssh.execCommand('node -e "try { const m = require(\'./data/organization_members_db.json\'); console.log(JSON.stringify(m.filter(x => x.role_id?.includes(\'vendor\') || x.email?.includes(\'vendor\')), null, 2)) } catch(e){ console.log(e.message) }"', { cwd: '/var/www/rfq' });
  console.log(res2.stdout);

  console.log('--- CHECK SUPABASE PROFILES TABLE ---');
  const res3 = await ssh.execCommand('node -e "const { createClient } = require(\'@supabase/supabase-js\'); const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); sb.from(\'profiles\').select(\'id, email, role, is_active\').eq(\'role\', \'vendor\').then(r => console.log(r.data))"', { cwd: '/var/www/rfq' });
  console.log(res3.stdout);

  ssh.dispose();
}

inspect();
