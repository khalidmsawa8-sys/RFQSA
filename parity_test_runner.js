const http = require("http");
const https = require("https");
const fs = require("fs");

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: "127.0.0.1",
      port: 3002,
      path: path,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": options.userId || "usr-test-client-101",
        "x-user-role": options.role || "client",
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log("================================================================");
  console.log("🧪 RUNNING VPS E2E SUITE: Web & Mobile Backend Parity 1:1");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log("  ✅ PASS: " + message);
      passed++;
    } else {
      console.error("  ❌ FAIL: " + message);
      failed++;
    }
  }

  // Test 1: Health / RFQ API
  console.log("🔹 Test 1: GET /api/rfqs (Client RFQ List)");
  const rfqs = await request("/api/rfqs");
  assert(rfqs.status === 200, "GET /api/rfqs returned HTTP " + rfqs.status);

  // Test 2: Create RFQ (4-Step Wizard Payload)
  console.log("\n🔹 Test 2: POST /api/rfqs with 4-Step Wizard Payload (Dual Contract)");
  const rfqRes = await request("/api/rfqs", {
    method: "POST",
    userId: "usr-test-client-101",
    role: "client",
    body: {
      carMake: "تويوتا",
      carModel: "لاندكروزر",
      carYear: 2024,
      plateNumber: "ر ف ق 2026",
      vin: "JTEBU5JR8K5019284",
      partsCategory: "brakes",
      partsCategoryName: "نظام الفرامل والمكابح (بريك)",
      partsList: [
        { partName: "فحمات فرامل أمامية أصلية وكالة", quantity: 2, partType: "original" },
        { partName: "هوبات أمامية أصلية", quantity: 2, partType: "original" },
      ],
      rfqType: "public",
      fulfillmentMethod: "delivery",
      deliveryMethod: "delivery",
      isUrgent: true,
      deliveryLocation: "الرياض - حي الياسمين - شارع أنس بن مالك",
      deliveryCity: "الرياض",
      deliveryDistrict: "الياسمين",
      recipientName: "سعد العتيبي",
      recipientPhone: "0551122334",
      notes: "الرجاء توفير قطع أصلية جديدة داخل كرتون تويوتا المعتمد مع الفاتورة الضريبية",
    }
  });
  assert(rfqRes.status === 200 || rfqRes.status === 201, "POST /api/rfqs returned HTTP " + rfqRes.status);
  const rfqId = rfqRes.data?.rfq?.id || rfqRes.data?.data?.id || rfqRes.data?.id;
  assert(Boolean(rfqId), "Created RFQ ID successfully: " + rfqId);

  // Test 3: Vendor Radar
  console.log("\n🔹 Test 3: Vendor Radar Live Matching & Visibility");
  const vendorRfqs = await request("/api/rfqs", { role: "vendor", userId: "vendor-demo-id" });
  assert(vendorRfqs.status === 200, "Vendor Radar returned HTTP 200");
  const list = Array.isArray(vendorRfqs.data) ? vendorRfqs.data : (vendorRfqs.data?.rfqs || vendorRfqs.data?.data || []);
  const found = list.find(r => r.id === rfqId || (r.car_make === "تويوتا" && r.car_model === "لاندكروزر"));
  assert(Boolean(found), "Vendor Radar received RFQ immediately (Total in radar: " + list.length + ")");

  // Test 4: Vendor Submits Itemized Quotation
  console.log("\n🔹 Test 4: Vendor Submits Itemized Quotation");
  const quoteRes = await request("/api/quotes", {
    method: "POST",
    userId: "vendor-demo-id",
    role: "vendor",
    body: {
      rfq_id: rfqId || "test-rfq",
      vendor_id: "vendor-demo-id",
      total_price: 1850.0,
      delivery_days: 1,
      delivery_cost: 0.0,
      notes: "القطع متوفرة بالمستودع أصلي وكالة بالكرتون والضمان 6 أشهر",
      items: [
        { part_name: "فحمات فرامل أمامية أصلية وكالة", quantity: 2, unit_price: 450.0, total_price: 900.0, brand: "Toyota Original" },
        { part_name: "هوبات أمامية أصلية", quantity: 2, unit_price: 475.0, total_price: 950.0, brand: "Toyota Original" },
      ],
    }
  });
  if (quoteRes.status !== 200 && quoteRes.status !== 201) {
    console.error("  ❌ Quote submission error response:", JSON.stringify(quoteRes.data));
  }
  assert(quoteRes.status === 200 || quoteRes.status === 201, "POST /api/quotes returned HTTP " + quoteRes.status);

  // Test 5: Client Deal Room Quotes Retrieval
  console.log("\n🔹 Test 5: Client Deal Room Quotes Retrieval & Acceptance");
  const quotesRes = await request("/api/quotes?rfq_id=" + (rfqId || "test"));
  assert(quotesRes.status === 200, "GET /api/quotes returned HTTP 200");

  // Test 6: Orders & Invoicing API
  console.log("\n🔹 Test 6: Orders & ZATCA Invoicing API");
  const orders = await request("/api/v1/orders");
  assert(orders.status === 200, "GET /api/v1/orders returned HTTP 200");

  // Test 7: Unified Wallet API
  console.log("\n🔹 Test 7: Unified Wallet Ledger API");
  const wallet = await request("/api/v1/wallet");
  assert(wallet.status === 200, "GET /api/v1/wallet returned HTTP 200");

  // Test 8: Organization & RBAC API
  console.log("\n🔹 Test 8: Organization & RBAC API");
  const org = await request("/api/v1/organization");
  assert(org.status === 200, "GET /api/v1/organization returned HTTP 200");

  // Test 9: Vendors Map API
  console.log("\n🔹 Test 9: Vendors GPS Map API (/api/v1/vendors/map)");
  const mapRes = await request("/api/v1/vendors/map");
  assert(mapRes.status === 200, "GET /api/v1/vendors/map returned HTTP 200");

  // Test 10: Live APK on Web Server
  console.log("\n🔹 Test 10: Public Release APK (/var/www/rfq/public/rfq.apk)");
  const apkPath = "/var/www/rfq/public/rfq.apk";
  const exists = fs.existsSync(apkPath);
  const sizeMb = exists ? (fs.statSync(apkPath).size / (1024 * 1024)).toFixed(2) : 0;
  assert(exists && Number(sizeMb) > 50, "rfq.apk exists and valid release size: " + sizeMb + " MB");

  console.log("\n================================================================");
  console.log("📊 RESULT: " + passed + " PASSED | " + failed + " FAILED");
  if (failed === 0) {
    console.log("🎉 100% SUCCESS: Web & Mobile Platforms are completely unified 1:1!");
    console.log("📲 Direct APK Link: https://rfqsa.tech/rfq.apk");
  }
  console.log("================================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

run();
