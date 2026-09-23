const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const script = `
node -e "
const fs = require('fs');
const path = require('path');

const rfqsFile = '/var/www/rfq/data/rfqs_db.json';
const uploadsDir = '/var/www/rfq/public/uploads/parts';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (fs.existsSync(rfqsFile)) {
  const content = fs.readFileSync(rfqsFile, 'utf-8');
  console.log('Original rfqs_db.json size:', (content.length / (1024 * 1024)).toFixed(2), 'MB');
  const rfqs = JSON.parse(content);

  let extractedImagesCount = 0;

  rfqs.forEach((rfq, rfqIdx) => {
    if (rfq.parts_description) {
      try {
        let parts = typeof rfq.parts_description === 'string' ? JSON.parse(rfq.parts_description) : rfq.parts_description;
        if (Array.isArray(parts)) {
          parts.forEach((p, pIdx) => {
            // Check images array
            if (Array.isArray(p.images)) {
              p.images = p.images.map((img, imgIdx) => {
                if (typeof img === 'string' && img.startsWith('data:image')) {
                  const match = img.match(/^data:image\\/([a-zA-Z0-9+]+);base64,(.+)$/);
                  if (match) {
                    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                    const filename = 'part_' + (rfq.id || rfqIdx) + '_' + pIdx + '_' + imgIdx + '.' + ext;
                    const filepath = path.join(uploadsDir, filename);
                    fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
                    extractedImagesCount++;
                    const publicUrl = '/uploads/parts/' + filename;
                    return publicUrl;
                  }
                }
                return img;
              });
            }

            // Check single image fields
            ['imagePreview', 'imagePathname', 'imageUrl', 'image_url'].forEach(key => {
              if (p[key] && typeof p[key] === 'string' && p[key].startsWith('data:image')) {
                const match = p[key].match(/^data:image\\/([a-zA-Z0-9+]+);base64,(.+)$/);
                if (match) {
                  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                  const filename = 'part_' + (rfq.id || rfqIdx) + '_' + pIdx + '_' + key + '.' + ext;
                  const filepath = path.join(uploadsDir, filename);
                  fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
                  extractedImagesCount++;
                  p[key] = '/uploads/parts/' + filename;
                }
              }
            });
          });

          rfq.parts_description = JSON.stringify(parts);
        }
      } catch (e) {
        console.error('Error parsing parts_description for RFQ', rfq.id, e.message);
      }
    }
  });

  // Save backup
  fs.writeFileSync(rfqsFile + '.bak', content, 'utf-8');
  const newContent = JSON.stringify(rfqs, null, 2);
  fs.writeFileSync(rfqsFile, newContent, 'utf-8');
  console.log('✅ Extracted images to disk:', extractedImagesCount);
  console.log('✅ Optimized rfqs_db.json size:', (newContent.length / 1024).toFixed(1), 'KB');
}
"
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected. Running optimization on VPS...');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Process finished with code:', code);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect(config);
