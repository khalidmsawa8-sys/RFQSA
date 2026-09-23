const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `node -e '
    const fs = require("fs");
    const rfqs = JSON.parse(fs.readFileSync("/var/www/rfq/data/rfqs_db.json", "utf8"));
    console.log("Total RFQs in DB:", rfqs.length);
    
    const vendorId = "vendor-demo-id";
    const vendorOrders = rfqs.filter(r => {
      const isDirectTarget = r.target_vendor_id && r.target_vendor_id === vendorId;
      const hasVendorQuote = (r.quotes || []).some(q => q.vendor_id === vendorId);
      const isAssigned = (r.quotes || []).some(q => q.vendor_id === vendorId && ["accepted", "fulfilled", "delivered"].includes(q.status));
      return isDirectTarget || hasVendorQuote || isAssigned;
    });
    console.log("Vendor (مؤسسة قطع الغيار المعتمدة) Orders count in /vendor/orders:", vendorOrders.length);
    console.log("Vendor Orders list:", vendorOrders.map(o => ({ id: o.id, make: o.car_make, status: o.status, target: o.target_vendor_id, quotes: (o.quotes||[]).length })));
  '`;

  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '147.93.56.252', port: 22, username: 'root', password: 'MoNjiz@M2024' });
