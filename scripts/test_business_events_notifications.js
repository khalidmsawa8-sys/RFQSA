const https = require('https');

const BASE_URL = 'https://rfqsa.tech';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runBusinessFlow() {
  console.log('====================================================');
  console.log('🚀 TESTING COMPLETE BUSINESS LIFECYCLE NOTIFICATION FLOW');
  console.log('Target: https://rfqsa.tech');
  console.log('====================================================\n');

  const clientId = 'client_usr_' + Date.now();
  const vendorId = 'vendor_usr_' + Date.now();
  const courierId = 'courier_usr_' + Date.now();
  const rfqId = 'RFQ-LIFE-' + Math.floor(1000 + Math.random() * 9000);
  const quoteId = 'QUO-LIFE-' + Math.floor(1000 + Math.random() * 9000);
  const orderId = 'ORD-LIFE-' + Math.floor(1000 + Math.random() * 9000);

  // Step 1: New RFQ dispatched to Vendor
  console.log('Step 1: Dispatching NEW_RFQ notification to Vendor...');
  const step1 = await request('POST', '/api/v1/notifications', {
    recipientId: vendorId,
    type: 'NEW_RFQ',
    title: 'طلب تسعير جديد متوافق مع تخصصك',
    body: `وصلك طلب تسعير جديد #${rfqId} لقطع غيار تويوتا كامري 2024`,
    entityType: 'RFQ',
    entityId: rfqId,
    route: `/vendor/quote/${rfqId}`,
    data: { rfqId },
  });
  console.log('Step 1 Result:', step1.data.success ? '✅ Success' : '❌ Failed', step1.data.notification?.id);

  // Step 2: New Offer submitted to Client
  console.log('\nStep 2: Dispatching NEW_OFFER notification to Client...');
  const step2 = await request('POST', '/api/v1/notifications', {
    recipientId: clientId,
    type: 'NEW_OFFER',
    title: 'وصل عرض سعر جديد لطلبك',
    body: `قدم مركز الرياض عرض سعر بقيمة 450 ر.س لطلبك #${rfqId}`,
    entityType: 'RFQ',
    entityId: rfqId,
    route: `/client/rfq/${rfqId}`,
    data: { rfqId, quoteId },
  });
  console.log('Step 2 Result:', step2.data.success ? '✅ Success' : '❌ Failed', step2.data.notification?.id);

  // Step 3: Offer accepted -> Notification to Vendor
  console.log('\nStep 3: Dispatching OFFER_ACCEPTED notification to Vendor...');
  const step3 = await request('POST', '/api/v1/notifications', {
    recipientId: vendorId,
    type: 'OFFER_ACCEPTED',
    title: 'تم قبول عرض السعر وبدء الصفقة 🎉',
    body: `قام العميل بقبول عرضك لطلب #${rfqId}. يرجى تجهيز القطع للتسليم.`,
    entityType: 'ORDER',
    entityId: orderId,
    route: `/deal/${orderId}`,
    data: { rfqId, orderId },
  });
  console.log('Step 3 Result:', step3.data.success ? '✅ Success' : '❌ Failed', step3.data.notification?.id);

  // Step 4: Delivery Assigned -> Notification to Courier
  console.log('\nStep 4: Dispatching DELIVERY_ASSIGNED notification to Courier...');
  const step4 = await request('POST', '/api/v1/notifications', {
    recipientId: courierId,
    type: 'DELIVERY_ASSIGNED',
    title: 'مهمة توصيل جديدة 🚚',
    body: `تم إسناد مهمة استلام وتوصيل شحنة جديدة للطلب #${orderId}`,
    entityType: 'DELIVERY',
    entityId: orderId,
    route: `/courier/orders/${orderId}`,
    data: { orderId },
  });
  console.log('Step 4 Result:', step4.data.success ? '✅ Success' : '❌ Failed', step4.data.notification?.id);

  // Step 5: Delivery Picked Up -> Notification to Client
  console.log('\nStep 5: Dispatching DELIVERY_PICKED_UP notification to Client...');
  const step5 = await request('POST', '/api/v1/notifications', {
    recipientId: clientId,
    type: 'DELIVERY_PICKED_UP',
    title: 'استلم المندوب طلبك',
    body: `تم استلام الشحنة #${orderId} من المورد وجاري بدء رحلة التوصيل`,
    entityType: 'ORDER',
    entityId: orderId,
    route: `/client/order/${orderId}`,
    data: { orderId },
  });
  console.log('Step 5 Result:', step5.data.success ? '✅ Success' : '❌ Failed', step5.data.notification?.id);

  // Step 6: Delivery On The Way -> Notification to Client
  console.log('\nStep 6: Dispatching DELIVERY_ON_THE_WAY notification to Client...');
  const step6 = await request('POST', '/api/v1/notifications', {
    recipientId: clientId,
    type: 'DELIVERY_ON_THE_WAY',
    title: 'مندوب التوصيل في طريقه إليك 📍',
    body: `المندوب يقترب من موقعك لتسليم الطلب #${orderId}`,
    entityType: 'ORDER',
    entityId: orderId,
    route: `/client/order/${orderId}`,
    data: { orderId },
  });
  console.log('Step 6 Result:', step6.data.success ? '✅ Success' : '❌ Failed', step6.data.notification?.id);

  // Step 7: Delivery Completed -> Notification to Client and Vendor
  console.log('\nStep 7: Dispatching DELIVERY_DELIVERED notification...');
  const step7a = await request('POST', '/api/v1/notifications', {
    recipientId: clientId,
    type: 'DELIVERY_DELIVERED',
    title: 'تم تسليم الطلب بنجاح ✅',
    body: `تم تسليم طلبك #${orderId} بنجاح. شكراً لاستخدامك تطبيق رفق!`,
    entityType: 'ORDER',
    entityId: orderId,
    route: `/client/order/${orderId}`,
    data: { orderId },
  });
  const step7b = await request('POST', '/api/v1/notifications', {
    recipientId: vendorId,
    type: 'ORDER_COMPLETED',
    title: 'تم اكتمال الطلب وإيداع مستحقاتك في المحفظة 💰',
    body: `تم تسليم الطلب #${orderId} للعميل واكتمال المعاملة بنجاح`,
    entityType: 'ORDER',
    entityId: orderId,
    route: `/deal/${orderId}`,
    data: { orderId },
  });
  console.log('Step 7 Result: Client Notif:', step7a.data.success ? '✅' : '❌', 'Vendor Notif:', step7b.data.success ? '✅' : '❌');

  // Verify Inboxes
  console.log('\n====================================================');
  console.log('📥 VERIFYING INBOXES ACROSS ALL 3 ROLES');
  console.log('====================================================');

  const clientInbox = await request('GET', `/api/v1/notifications?userId=${clientId}`);
  console.log(`Client Inbox: ${clientInbox.data.notifications?.length} notifications (Unread: ${clientInbox.data.unreadCount})`);

  const vendorInbox = await request('GET', `/api/v1/notifications?userId=${vendorId}`);
  console.log(`Vendor Inbox: ${vendorInbox.data.notifications?.length} notifications (Unread: ${vendorInbox.data.unreadCount})`);

  const courierInbox = await request('GET', `/api/v1/notifications?userId=${courierId}`);
  console.log(`Courier Inbox: ${courierInbox.data.notifications?.length} notifications (Unread: ${courierInbox.data.unreadCount})`);

  if (
    clientInbox.data.notifications?.length >= 4 &&
    vendorInbox.data.notifications?.length >= 3 &&
    courierInbox.data.notifications?.length >= 1
  ) {
    console.log('\n🎉 ALL BUSINESS LIFECYCLE NOTIFICATIONS VERIFIED AND PERSISTED SUCCESSFULLY!');
  } else {
    console.error('\n❌ Lifecycle verification count mismatch!');
    process.exit(1);
  }
}

runBusinessFlow().catch(err => {
  console.error('Business flow error:', err);
  process.exit(1);
});
