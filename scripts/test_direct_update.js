const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand(`node -e "
    const fs = require('fs');
    // Let's test server.ts createClient update organization_members
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'demo-rfq-marketplace';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'demo-key';
    const { createClient } = require('./lib/supabase/server');
    (async () => {
      const supabase = await createClient();
      const { data: mem } = await supabase.from('organization_members').select('*').eq('user_id', 'client-demo-id').maybeSingle();
      console.log('Found mem:', mem);
      if (mem) {
        const up = await supabase.from('organization_members').update({ role_id: 'client_procurement_manager' }).eq('id', mem.id);
        console.log('Update result:', up);
        const after = JSON.parse(fs.readFileSync('/var/www/rfq/data/organization_members_db.json'));
        console.log('After in file:', after.find(x => x.id === mem.id));
      }
    })();
  "`, { cwd: '/var/www/rfq' });

  console.log(res.stdout);
  console.log(res.stderr);
  ssh.dispose();
}

main().catch(console.error);
