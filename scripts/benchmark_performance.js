const https = require('https');
const http = require('http');

const ENDPOINTS = [
  { name: 'Home Page (Web)', path: '/' },
  { name: 'Client Orders (Web)', path: '/client/orders' },
  { name: 'Vendor Orders (Web)', path: '/vendor/orders' },
  { name: 'Vendor Radar (Web)', path: '/vendor/radar' },
  { name: 'RFQs API (/api/rfqs)', path: '/api/rfqs' },
  { name: 'Quotes API (/api/quotes)', path: '/api/quotes' },
  { name: 'Vendor Map API (/api/v1/vendors/map)', path: '/api/v1/vendors/map' },
  { name: 'Direct APK Link (/rfq.apk Header)', path: '/rfq.apk', headOnly: true },
];

async function measure(endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: 'rfqsa.tech',
      port: 443,
      path: endpoint.path,
      method: endpoint.headOnly ? 'HEAD' : 'GET',
      headers: {
        'User-Agent': 'PerformanceTester/1.0',
        'Accept-Encoding': 'gzip, deflate',
      },
      rejectUnauthorized: false,
    };

    const req = https.request(options, (res) => {
      let totalBytes = 0;
      res.on('data', (chunk) => {
        totalBytes += chunk.length;
      });
      res.on('end', () => {
        const duration = Date.now() - start;
        const encoding = res.headers['content-encoding'] || 'none';
        resolve({
          name: endpoint.name,
          statusCode: res.statusCode,
          durationMs: duration,
          sizeKb: (totalBytes / 1024).toFixed(2),
          encoding: encoding,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name: endpoint.name,
        error: err.message,
        durationMs: Date.now() - start,
      });
    });

    req.end();
  });
}

async function runBenchmark() {
  console.log('===============================================================');
  console.log('⚡ HIGH-PERFORMANCE SPEED & LATENCY BENCHMARK — rfqsa.tech');
  console.log('===============================================================');
  
  for (const ep of ENDPOINTS) {
    const result = await measure(ep);
    if (result.error) {
      console.log(`❌ ${result.name}: ERROR (${result.error})`);
    } else {
      console.log(`🚀 ${result.name.padEnd(38)} | Status: ${result.statusCode} | Time: ${result.durationMs.toString().padStart(4)} ms | Size: ${result.sizeKb.padStart(6)} KB | Encoding: ${result.encoding}`);
    }
  }
  console.log('===============================================================');
}

runBenchmark();
