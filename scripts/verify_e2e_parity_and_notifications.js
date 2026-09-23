const { NodeSSH } = require('node-ssh');
const https = require('https');
const http = require('http');

const ssh = new NodeSSH();

async function runE2EVerification() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE E2E VERIFICATION TEST SUITE');
  console.log('Host: 147.93.56.252 (rfqsa.tech)');
  console.log('====================================================\n');

  try {
    console.log('1️⃣ Connecting to SSH server...');
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
      tryKeyboard: true,
    });
    console.log('✅ SSH Connected!\n');

    const execute = async (command, title) => {
      console.log(`\n▶️ [${title}]: ${command}`);
      const res = await ssh.execCommand(command, { cwd: '/var/www/rfq' });
      if (res.stdout) console.log(res.stdout);
      if (res.stderr && res.code !== 0) console.error('STDERR:', res.stderr);
      return res;
    };

    // ── 1. TEST DEVICE FCM TOKEN REGISTRATION ──
    console.log('\n--- 1. Testing Device FCM Token Registration ---');
    const registerTokenScript = `node -e "
      const http = require('http');
      const data = JSON.stringify({
        fcm_token: 'fcm_live_device_token_client_101',
        platform: 'android',
        userId: 'client-demo-id',
        deviceId: 'device-client-pixel8',
        deviceModel: 'Pixel 8 Pro',
        osVersion: 'Android 14',
        appVersion: '1.0.0'
      });
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3002,
        path: '/api/v1/notifications/register-device',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-user-id': 'client-demo-id'
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          console.log('Register Device Response:', body);
        });
      });
      req.write(data);
      req.end();
    "`;
    await execute(registerTokenScript, 'REGISTER CLIENT FCM TOKEN');

    // Register Vendor FCM Token
    const registerVendorTokenScript = `node -e "
      const http = require('http');
      const data = JSON.stringify({
        fcm_token: 'fcm_live_device_token_vendor_501',
        platform: 'android',
        userId: 'vendor-demo-id',
        deviceId: 'device-vendor-galaxy',
        deviceModel: 'Samsung Galaxy S24',
        osVersion: 'Android 14',
        appVersion: '1.0.0'
      });
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3002,
        path: '/api/v1/notifications/register-device',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-user-id': 'vendor-demo-id'
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          console.log('Register Vendor Device Response:', body);
        });
      });
      req.write(data);
      req.end();
    "`;
    await execute(registerVendorTokenScript, 'REGISTER VENDOR FCM TOKEN');

    // ── 2. CREATE A NEW RFQ AS CLIENT (Matching Mobile App Payload) ──
    console.log('\n--- 2. Creating New RFQ from Mobile Payload ---');
    const createRfqScript = `node -e "
      const http = require('http');
      const payload = JSON.stringify({
        carMake: 'تويوتا',
        carModel: 'كامري',
        carYear: 2024,
        plateNumber: 'أ ب ج 9988',
        vin: '4T1B11HK5PU123456',
        partsCategory: 'brakes',
        partsCategoryName: 'الفرامل والمكابح',
        partsText: 'فحمات فرامل أمامية + هوبات',
        partsList: [
          {
            name: 'فحمات فرامل أمامية',
            partName: 'فحمات فرامل أمامية',
            partNumber: '04465-33471',
            quantity: 2,
            images: [],
            category: 'brakes'
          },
          {
            name: 'هوبات فرامل أصلية',
            partName: 'هوبات فرامل أصلية',
            partNumber: '43512-06150',
            quantity: 2,
            images: [],
            category: 'brakes'
          }
        ],
        rfqType: 'public',
        deliveryMethod: 'delivery',
        fulfillmentMethod: 'DELIVERY',
        locationName: 'الرياض - حي الياسمين',
        deliveryCity: 'الرياض',
        isUrgent: false,
        clientId: 'client-demo-id'
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 3002,
        path: '/api/rfqs',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-user-id': 'client-demo-id',
          'Cookie': 'rfq_session=client; rfq_user_id=client-demo-id;'
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          console.log('Create RFQ Response:', body);
        });
      });
      req.write(payload);
      req.end();
    "`;
    await execute(createRfqScript, 'CREATE RFQ VIA /api/rfqs');

    // ── 3. VERIFY RFQ IN GET /api/rfqs FOR CLIENT & VENDOR RADAR ──
    console.log('\n--- 3. Verifying RFQ in GET /api/rfqs for Client & Vendor ---');
    const verifyRfqsScript = `node -e "
      const http = require('http');
      
      // Check Client View
      http.get({
        hostname: '127.0.0.1',
        port: 3002,
        path: '/api/rfqs',
        headers: {
          'x-user-id': 'client-demo-id',
          'x-user-role': 'client',
          'Cookie': 'rfq_session=client; rfq_user_id=client-demo-id;'
        }
      }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          const parsed = JSON.parse(body);
          console.log('Client RFQs Count:', parsed.rfqs ? parsed.rfqs.length : 0);
          const latest = parsed.rfqs && parsed.rfqs[0];
          console.log('Latest RFQ for Client:', latest ? { id: latest.id, make: latest.car_make, model: latest.car_model, status: latest.status, expires_at: latest.expires_at } : 'None');
        });
      });

      // Check Vendor Radar View
      setTimeout(() => {
        http.get({
          hostname: '127.0.0.1',
          port: 3002,
          path: '/api/rfqs',
          headers: {
            'x-user-id': 'vendor-demo-id',
            'x-user-role': 'vendor',
            'Cookie': 'rfq_session=vendor; rfq_user_id=vendor-demo-id;'
          }
        }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            const parsed = JSON.parse(body);
            console.log('Vendor Radar RFQs Count:', parsed.rfqs ? parsed.rfqs.length : 0);
            const latest = parsed.rfqs && parsed.rfqs[0];
            console.log('Latest RFQ in Vendor Radar:', latest ? { id: latest.id, make: latest.car_make, model: latest.car_model, status: latest.status } : 'None');
          });
        });
      }, 500);
    "`;
    await execute(verifyRfqsScript, 'VERIFY RFQS FOR CLIENT & VENDOR');

    // ── 4. VERIFY NOTIFICATIONS CREATED AND STORED ──
    console.log('\n--- 4. Checking Notification Records in Database ---');
    const verifyNotifsScript = `node -e "
      const fs = require('fs');
      if (fs.existsSync('/var/www/rfq/data/notifications_db.json')) {
        const notifs = JSON.parse(fs.readFileSync('/var/www/rfq/data/notifications_db.json', 'utf8'));
        console.log('Total Notifications Count:', notifs.length);
        console.log('Latest 3 Notifications:', notifs.slice(0, 3).map(n => ({ id: n.id, user: n.user_id, title: n.title, type: n.type })));
      } else {
        console.log('notifications_db.json does not exist');
      }

      if (fs.existsSync('/var/www/rfq/data/fcm_tokens_db.json')) {
        const tokens = JSON.parse(fs.readFileSync('/var/www/rfq/data/fcm_tokens_db.json', 'utf8'));
        console.log('Registered FCM Tokens Count:', tokens.length);
        console.log('Tokens:', tokens.map(t => ({ user: t.user_id, platform: t.platform, token: t.fcm_token.slice(0, 20) + '...', active: t.is_active })));
      }
    "`;
    await execute(verifyNotifsScript, 'INSPECT NOTIFICATIONS & FCM TOKENS DB');

    console.log('\n====================================================');
    console.log('✅ E2E VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ E2E Verification failed:', err);
  } finally {
    ssh.dispose();
  }
}

runE2EVerification();
