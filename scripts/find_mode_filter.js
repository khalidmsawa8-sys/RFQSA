const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app/client/orders/orders-client.tsx');
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('mode === "rfq"') || line.includes('mode === "active"') || line.includes('tab === "rfq"') || line.includes('itemType === "rfq"')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
