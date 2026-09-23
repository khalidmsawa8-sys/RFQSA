const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let supabaseKey = "";
env.split("\n").forEach(line => {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim().replace(/["']/g, "");
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) supabaseKey = line.split("=")[1].trim().replace(/["']/g, "");
  if (!supabaseKey && line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) supabaseKey = line.split("=")[1].trim().replace(/["']/g, "");
});

console.log("Connecting to Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  // 1. Fetch all profiles
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, full_name, role, email");
  console.log("=== PROFILES ===");
  if (pErr) console.error("Profiles error:", pErr);
  else console.table(profiles);

  // 2. Fetch all RFQs
  const { data: rfqs, error: rErr } = await supabase.from("rfqs").select("id, client_id, car_make, car_model, car_year, parts_description, created_at, status");
  console.log("=== RFQS IN DATABASE ===");
  if (rErr) console.error("RFQs error:", rErr);
  else console.table(rfqs);

  // 3. Fetch all Orders
  const { data: orders, error: oErr } = await supabase.from("orders").select("id, client_id, total_price, status, created_at");
  console.log("=== ORDERS IN DATABASE ===");
  if (oErr) console.error("Orders error:", oErr);
  else console.table(orders);
}

checkDatabase();
