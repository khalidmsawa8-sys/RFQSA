const { Client } = require('./node_modules/ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('Connected to VPS.');
  conn.exec('grep -rn "INVALID_VENDOR_ROLE" /var/www/rfq/ /var/www/ 2>/dev/null', (err, stream) => {
    let out = '';
    stream.on('data', (d) => out += d.toString());
    stream.on('close', () => {
      console.log('--- Grep /var/www/rfq for INVALID_VENDOR_ROLE ---\n', out || 'None');
      
      conn.exec('grep -rn "VENDOR_ROLE" /var/www/rfq/ /var/www/ 2>/dev/null', (err2, stream2) => {
        let out2 = '';
        stream2.on('data', (d) => out2 += d.toString());
        stream2.on('close', () => {
          console.log('--- Grep VENDOR_ROLE ---\n', out2 || 'None');
          
          conn.exec('pm2 logs --nostream --lines 50', (err3, stream3) => {
            let logs = '';
            stream3.on('data', (d) => logs += d.toString());
            stream3.on('close', () => {
              console.log('--- PM2 Logs ---\n', logs.slice(-2000));
              conn.end();
            });
          });
        });
      });
    });
  });
}).connect({ host: '147.93.56.252', port: 22, username: 'root', password: 'MoNjiz@M2024' });
