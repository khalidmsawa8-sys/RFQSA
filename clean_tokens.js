const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`node -e '
    const fs = require("fs");
    const file = "/var/www/rfq/data/fcm_tokens_db.json";
    if (fs.existsSync(file)) {
      const tokens = JSON.parse(fs.readFileSync(file, "utf8")).filter(t => t.fcm_token && t.fcm_token.length > 50 && t.is_active);
      fs.writeFileSync(file, JSON.stringify(tokens, null, 2));
      console.log("Active real tokens count:", tokens.length);
    }
  '`, (err, stream) => {
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '147.93.56.252', port: 22, username: 'root', password: 'MoNjiz@M2024' });
