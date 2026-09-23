const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app/client/orders/orders-client.tsx');
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

console.log('Total lines:', lines.length);

lines.forEach((line, i) => {
  if (line.includes('window.') && !line.includes('typeof window')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('sessionStorage.') && !line.includes('typeof window')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
  if (line.includes('localStorage.') && !line.includes('typeof window')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
