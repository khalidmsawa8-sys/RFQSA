const https = require('https');

const targetToken = "f6zeiH7ESZWhH7JSfyjOGI:APA91bHKV2iw-eAe-rsW1Jm5YIlxLkeOc1UyJ_eavfQZdUAX6DfxrruHCv351S1BDclY0jsLK4qKrRzuHdVP9VcNvNrVUlxuoG0m-GN0zXH19vKn71wlkp0";
const apiKey = "AIzaSyBN0_z2fQlhi-y1mNuBipsJABUhFHvt4V0";

const payload = JSON.stringify({
  to: targetToken,
  priority: "high",
  notification: {
    title: "اختبار مباشر من رفق 🚗",
    body: "تم إرسال هذا التنبيه ذو الأولوية القصوى مباشرة لجهازك",
    sound: "default",
    android_channel_id: "rfq_high_importance_channel"
  },
  data: {
    type: "new_rfq",
    rfqId: "RFQ-9901",
    server_sent_at: new Date().toISOString()
  }
});

const req = https.request(
  {
    hostname: "fcm.googleapis.com",
    path: "/fcm/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${apiKey}`
    }
  },
  (res) => {
    let body = "";
    res.on("data", (chunk) => (body += chunk));
    res.on("end", () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${body}`);
    });
  }
);

req.on("error", (e) => console.error("Error:", e));
req.write(payload);
req.end();
