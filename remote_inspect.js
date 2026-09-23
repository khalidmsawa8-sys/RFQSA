const fs = require("fs");
const path = "/var/www/rfq/.env.local";
let env = {};
if (fs.existsSync(path)) {
  fs.readFileSync(path, "utf8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && v) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  });
}
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.vendor&select=id,role,company_name,specialized_brands,specializes_in_all_brands&limit=5`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log("Existing vendors in Supabase:", JSON.stringify(data, null, 2));

  const testVendorRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.usr-vendor-202`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    }
  });
  const testVendor = await testVendorRes.json();
  console.log("usr-vendor-202 in Supabase:", JSON.stringify(testVendor, null, 2));
}
check();
