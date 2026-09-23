const fs = require("fs");

function check(file) {
  console.log(`\n=== Checking ${file} ===`);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes("RFQS_FILE") || line.includes('"rfqs"') || line.includes("'rfqs'")) {
      console.log(`${idx + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

check("lib/supabase/server.ts");
check("lib/supabase/client.ts");
check("app/api/rfqs/[id]/reactivate/route.ts");
