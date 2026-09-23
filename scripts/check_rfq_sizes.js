const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envFile, 'utf-8');
const envMap = {};
env.split('\n').forEach(l => {
  const parts = l.split('=');
  if (parts.length >= 2) {
    envMap[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const url = envMap.NEXT_PUBLIC_SUPABASE_URL;
const key = envMap.SUPABASE_SERVICE_ROLE_KEY || envMap.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('rfqs').select('id, parts_description');
  if (error) {
    console.error('Error fetching rfqs:', error);
    return;
  }
  console.log('Total RFQs in DB:', data.length);
  let totalBytes = 0;
  const largeIds = [];
  data.forEach(r => {
    const s = JSON.stringify(r);
    totalBytes += s.length;
    if (s.length > 50000) {
      console.log('Large RFQ in DB -> ID:', r.id, 'Size:', (s.length / 1024).toFixed(1), 'KB');
      largeIds.push({ id: r.id, size: s.length, parts: r.parts_description });
    }
  });
  console.log('Total DB RFQs JSON size:', (totalBytes / (1024 * 1024)).toFixed(2), 'MB');
  return largeIds;
}

run();
