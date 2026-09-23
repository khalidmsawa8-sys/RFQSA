const { NodeSSH } = require('node-ssh');

async function run() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  
  const checkJson = await ssh.execCommand('cat /var/www/rfq/data/vendor_branches_db.json');
  console.log('vendor_branches_db.json:');
  console.log(checkJson.stdout);

  const checkProfiles = await ssh.execCommand(`node -e '
    const fs = require("fs");
    const env = fs.readFileSync("/var/www/rfq/.env.local", "utf8");
    const getVal = (k) => {
      const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
      return m ? m[1].trim().replace(/^["\x27]|["\x27]$/g, "") : "";
    };
    const url = getVal("NEXT_PUBLIC_SUPABASE_URL");
    const key = getVal("SUPABASE_SERVICE_ROLE_KEY") || getVal("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const { createClient } = require("@supabase/supabase-js");
    const sb = createClient(url, key);
    async function check() {
      const { data: profs } = await sb.from("profiles").select("id, role, company_name, branches, latitude, longitude");
      console.log("PROFILES:", JSON.stringify(profs, null, 2));
      const { data: bTable } = await sb.from("vendor_branches").select("*");
      console.log("VENDOR_BRANCHES_TABLE:", JSON.stringify(bTable, null, 2));
    }
    check();
  '`);
  console.log('Remote DB check:');
  console.log(checkProfiles.stdout);
  console.log(checkProfiles.stderr);
  
  ssh.dispose();
}

run().catch(console.error);
