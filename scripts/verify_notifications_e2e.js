const https = require('https');
const http = require('http');

const BASE_URL = 'https://rfqsa.tech';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PRODUCTION NOTIFICATION E2E TEST SUITE');
  console.log('Target:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const testUserIdClient = 'test-client-' + Date.now();
  const testUserIdVendor = 'test-vendor-' + Date.now();
  const testUserIdCourier = 'test-courier-' + Date.now();
  const testTokenClient = 'fcm_test_token_client_' + Date.now();
  const testTokenVendor = 'fcm_test_token_vendor_' + Date.now();
  const testTokenCourier = 'fcm_test_token_courier_' + Date.now();

  // Test 1: Register Device Token
  try {
    console.log('Test 1: Register Device Token (Client & Vendor & Courier)...');
    const regClient = await request('POST', '/api/v1/notifications/register-device', {
      userId: testUserIdClient,
      pushToken: testTokenClient,
      platform: 'android',
      appVersion: '1.0.0',
      deviceModel: 'Pixel 8',
      osVersion: 'Android 14',
    });
    const regVendor = await request('POST', '/api/v1/notifications/register-device', {
      userId: testUserIdVendor,
      pushToken: testTokenVendor,
      platform: 'android',
      appVersion: '1.0.0',
      deviceModel: 'Galaxy S24',
      osVersion: 'Android 14',
    });
    const regCourier = await request('POST', '/api/v1/notifications/register-device', {
      userId: testUserIdCourier,
      pushToken: testTokenCourier,
      platform: 'android',
      appVersion: '1.0.0',
      deviceModel: 'iPhone 15',
      osVersion: 'iOS 17',
    });

    if (regClient.status === 200 && regVendor.status === 200 && regCourier.status === 200) {
      console.log('✅ Device registration succeeded for all 3 roles.');
      passed++;
    } else {
      console.error('❌ Device registration failed:', regClient, regVendor, regCourier);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 1 exception:', err);
    failed++;
  }

  // Test 2: Unread count on fresh user (should be 0)
  try {
    console.log('\nTest 2: Check Initial Unread Count...');
    const unread = await request('GET', `/api/v1/notifications/unread-count?userId=${testUserIdClient}`);
    if (unread.status === 200 && unread.data.unreadCount === 0) {
      console.log('✅ Initial unread count is 0 as expected.');
      passed++;
    } else {
      console.error('❌ Unexpected unread count:', unread);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 2 exception:', err);
    failed++;
  }

  // Test 3: Send Notification via API
  let createdNotificationId = null;
  try {
    console.log('\nTest 3: Dispatch Business Notification Event...');
    const notif = await request('POST', '/api/v1/notifications', {
      recipientId: testUserIdClient,
      title: 'وصول عرض سعر جديد',
      body: 'قام المورد بتقديم عرض سعر جديد لطلبك #RFQ-TEST',
      type: 'NEW_OFFER',
      entityType: 'RFQ',
      entityId: 'RFQ-TEST-123',
      route: '/client/deal-room?rfqId=RFQ-TEST-123',
      data: { rfqId: 'RFQ-TEST-123', offerId: 'OFF-101' },
    });

    if (notif.status === 200 && notif.data.success && notif.data.notification) {
      createdNotificationId = notif.data.notification.id;
      console.log(`✅ Notification dispatched successfully with ID: ${createdNotificationId}`);
      passed++;
    } else {
      console.error('❌ Notification dispatch failed:', notif);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 3 exception:', err);
    failed++;
  }

  // Test 4: Check Unread count updated to 1
  try {
    console.log('\nTest 4: Verify Unread Count Incremented...');
    const unreadAfter = await request('GET', `/api/v1/notifications/unread-count?userId=${testUserIdClient}`);
    if (unreadAfter.status === 200 && unreadAfter.data.unreadCount === 1) {
      console.log('✅ Unread count is now 1.');
      passed++;
    } else {
      console.error('❌ Unread count did not increment:', unreadAfter);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 4 exception:', err);
    failed++;
  }

  // Test 5: Query notifications list
  try {
    console.log('\nTest 5: Fetch Notification List...');
    const listRes = await request('GET', `/api/v1/notifications?userId=${testUserIdClient}`);
    if (listRes.status === 200 && Array.isArray(listRes.data.notifications) && listRes.data.notifications.length > 0) {
      const item = listRes.data.notifications[0];
      if (item.type === 'NEW_OFFER' && item.entityType === 'RFQ' && item.entityId === 'RFQ-TEST-123') {
        console.log('✅ Notification list payload matches required contract with entityId & type.');
        passed++;
      } else {
        console.error('❌ Notification payload contract mismatch:', item);
        failed++;
      }
    } else {
      console.error('❌ Failed to fetch notifications list:', listRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 5 exception:', err);
    failed++;
  }

  // Test 6: Mark single notification as read
  try {
    console.log('\nTest 6: Mark Single Notification As Read...');
    const readRes = await request('PATCH', `/api/v1/notifications/${createdNotificationId}/read`, {
      userId: testUserIdClient,
    });
    if (readRes.status === 200 && readRes.data.success) {
      const unreadCheck = await request('GET', `/api/v1/notifications/unread-count?userId=${testUserIdClient}`);
      if (unreadCheck.data.unreadCount === 0) {
        console.log('✅ Single notification marked read, unread count synced to 0.');
        passed++;
      } else {
        console.error('❌ Unread count not updated after read:', unreadCheck);
        failed++;
      }
    } else {
      console.error('❌ Mark as read failed:', readRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 6 exception:', err);
    failed++;
  }

  // Test 7: Dispatch second notification & Test Mark All As Read
  try {
    console.log('\nTest 7: Dispatch Second Notification & Mark All Read...');
    await request('POST', '/api/v1/notifications', {
      recipientId: testUserIdClient,
      title: 'استلم المندوب طلبك',
      body: 'تم استلام الشحنة وهي في طريقها إليك الآن',
      type: 'DELIVERY_PICKED_UP',
      entityType: 'ORDER',
      entityId: 'ORD-999',
      route: '/client/order-tracking?orderId=ORD-999',
      data: { orderId: 'ORD-999' },
    });

    const markAllRes = await request('PATCH', '/api/v1/notifications/read-all', {
      userId: testUserIdClient,
    });
    if (markAllRes.status === 200 && markAllRes.data.success) {
      const unreadFinal = await request('GET', `/api/v1/notifications/unread-count?userId=${testUserIdClient}`);
      if (unreadFinal.data.unreadCount === 0) {
        console.log('✅ Mark all read succeeded, unread count is 0.');
        passed++;
      } else {
        console.error('❌ Mark all read did not zero unread count:', unreadFinal);
        failed++;
      }
    } else {
      console.error('❌ Mark all read API failed:', markAllRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 7 exception:', err);
    failed++;
  }

  // Test 8: Deactivate device token on logout
  try {
    console.log('\nTest 8: Deactivate Token on Logout...');
    const logoutRes = await request('DELETE', `/api/v1/notifications/devices?userId=${testUserIdClient}&pushToken=${testTokenClient}`);
    if (logoutRes.status === 200 && logoutRes.data.success) {
      console.log('✅ Device token deactivated successfully on logout.');
      passed++;
    } else {
      console.error('❌ Deactivate device token failed:', logoutRes);
      failed++;
    }
  } catch (err) {
    console.error('❌ Test 8 exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
