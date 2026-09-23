const https = require('https');

const data = JSON.stringify({
  userId: "client-demo-id",
  title: "منظومة رفق 🚗 (تنبيه فوري عالي الأولوية)",
  message: "إشعار تشغيلي فوري - تم استلام هذا التنبيه في أجزاء من الثانية",
  channelId: "rfq_high_importance_channel"
});

const req = https.request({
  hostname: "rfqsa.tech",
  path: "/api/v1/notifications/test-fcm",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let body = "";
  res.on("data", c => body += c);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});

req.on("error", e => console.error("Error:", e));
req.write(data);
req.end();
