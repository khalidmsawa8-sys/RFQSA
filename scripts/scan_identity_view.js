const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'components/identity/unified-identity-settings-view.tsx');
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.includes('window') && !line.includes('typeof window')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
