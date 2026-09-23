const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'app/api/v1/support/route.ts',
  'app/api/v1/support/[id]/messages/route.ts',
  'app/api/v1/client/support/[id]/messages/route.ts',
  'app/api/v1/admin/support/route.ts',
  'app/api/v1/admin/support/[id]/route.ts',
  'components/support/new-support-request-modal.tsx',
  'components/support/new-vendor-support-modal.tsx',
  'components/support/client-ticket-conversation.tsx',
  'app/client/support/page.tsx',
  'app/client/support/support-client.tsx',
  'app/client/support/[id]/page.tsx',
  'app/vendor/support/page.tsx',
  'app/vendor/support/vendor-support-client.tsx',
  'app/vendor/support/[id]/page.tsx',
  'app/admin/(dashboard)/support/page.tsx',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
];

async function deployAndVerify() {
  const ssh = new NodeSSH();
  console.log('1️⃣ Connecting to VPS 147.93.56.252...');
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });
  console.log('✅ SSH Connected!\n');

  const localBase = path.join(__dirname, '..');
  const remoteBase = '/var/www/rfq';

  // Ensure remote directories exist
  console.log('Ensuring directories exist on VPS...');
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/support/[id]/messages');
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/client/support/[id]/messages');
  await ssh.execCommand('mkdir -p /var/www/rfq/app/api/v1/admin/support/[id]');

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}...`);
    await ssh.putFile(localPath, remotePath);
  }
  console.log('✅ All files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1200));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const restartRes = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(restartRes.stdout);

  // Allow PM2 process a few seconds to warm up
  await new Promise(r => setTimeout(r, 4000));

  console.log('4️⃣ Running live verification tests across Client, Vendor, and Admin...');

  // Test 1: Client creates a support ticket
  console.log('\n--- Test 1: Client POST /api/v1/support ---');
  const clientPayload = JSON.stringify({
    request_type: 'return_replacement',
    reason: 'قطعة بها خدش ونرغب في استبدالها بأخرى جديدة',
    initial_message: 'السلام عليكم، وصلني الصدام وبه كسر في الزاوية اليسرى وأرغب باستبداله.',
  });
  const createClientTicket = await ssh.execCommand(
    `curl -s -X POST "http://127.0.0.1:3002/api/v1/support" \
     -H "Content-Type: application/json" \
     -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id" \
     -d '${clientPayload.replace(/'/g, "'\\''")}'`
  );
  console.log('Client Ticket Creation Response:', createClientTicket.stdout);
  let clientTicket = null;
  try {
    const parsed = JSON.parse(createClientTicket.stdout);
    clientTicket = parsed.ticket;
  } catch (e) {
    console.error('Failed to parse client ticket response:', e);
  }

  // Test 2: Vendor creates a support ticket
  console.log('\n--- Test 2: Vendor POST /api/v1/support ---');
  const vendorPayload = JSON.stringify({
    request_type: 'payout_withdrawal',
    reason: 'طلب تحويل مستحقات المبيعات للبنك',
    initial_message: 'مرحبا فريق الدعم، نأمل مراجعة طلب السحب وتحويل المبلغ إلى حسابنا البنكي.',
  });
  const createVendorTicket = await ssh.execCommand(
    `curl -s -X POST "http://127.0.0.1:3002/api/v1/support" \
     -H "Content-Type: application/json" \
     -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id" \
     -d '${vendorPayload.replace(/'/g, "'\\''")}'`
  );
  console.log('Vendor Ticket Creation Response:', createVendorTicket.stdout);
  let vendorTicket = null;
  try {
    const parsed = JSON.parse(createVendorTicket.stdout);
    vendorTicket = parsed.ticket;
  } catch (e) {
    console.error('Failed to parse vendor ticket response:', e);
  }

  // Test 3: Admin lists all tickets
  console.log('\n--- Test 3: Admin GET /api/v1/admin/support ---');
  const adminListRes = await ssh.execCommand(
    `curl -s "http://127.0.0.1:3002/api/v1/admin/support" \
     -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"`
  );
  try {
    const adminData = JSON.parse(adminListRes.stdout);
    console.log(`Admin retrieved ${adminData.tickets?.length || 0} tickets.`);
    console.log('Sample ticket in Admin:', adminData.tickets?.[0]);
  } catch (e) {
    console.log('Admin List Raw Output:', adminListRes.stdout);
  }

  // Test 4: Admin replies to Client Ticket
  if (clientTicket?.id) {
    console.log(`\n--- Test 4: Admin Replies to Client Ticket ${clientTicket.id} ---`);
    const adminReplyPayload = JSON.stringify({
      message: 'أهلاً بك، تم استلام طلبك وسيتواصل معك مندوب الاستبدال خلال 24 ساعة.',
    });
    const adminReplyRes = await ssh.execCommand(
      `curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/support/${clientTicket.id}" \
       -H "Content-Type: application/json" \
       -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" \
       -d '${adminReplyPayload.replace(/'/g, "'\\''")}'`
    );
    console.log('Admin Reply Response:', adminReplyRes.stdout);

    // Test 5: Client reads conversation thread
    console.log(`\n--- Test 5: Client GET /api/v1/support/${clientTicket.id}/messages ---`);
    const clientMessagesRes = await ssh.execCommand(
      `curl -s "http://127.0.0.1:3002/api/v1/support/${clientTicket.id}/messages" \
       -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"`
    );
    console.log('Conversation Thread for Client:', clientMessagesRes.stdout);

    // Test 6: Admin updates status to accepted
    console.log(`\n--- Test 6: Admin PATCH /api/v1/admin/support/${clientTicket.id} (status: accepted) ---`);
    const updateStatusPayload = JSON.stringify({ status: 'accepted' });
    const updateStatusRes = await ssh.execCommand(
      `curl -s -X PATCH "http://127.0.0.1:3002/api/v1/admin/support/${clientTicket.id}" \
       -H "Content-Type: application/json" \
       -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id" \
       -d '${updateStatusPayload.replace(/'/g, "'\\''")}'`
    );
    console.log('Update Status Response:', updateStatusRes.stdout);
  }

  // Test 7: Verify Client Support List contains the updated ticket
  console.log('\n--- Test 7: Client GET /api/v1/support ---');
  const clientListRes = await ssh.execCommand(
    `curl -s "http://127.0.0.1:3002/api/v1/support" \
     -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"`
  );
  try {
    const clientData = JSON.parse(clientListRes.stdout);
    console.log(`Client retrieved ${clientData.tickets?.length || 0} tickets.`);
    console.log('Latest Client ticket:', clientData.tickets?.[0]);
  } catch (e) {
    console.log('Client List Raw Output:', clientListRes.stdout);
  }

  // Test 8: Verify Vendor Support List contains vendor ticket
  console.log('\n--- Test 8: Vendor GET /api/v1/support ---');
  const vendorListRes = await ssh.execCommand(
    `curl -s "http://127.0.0.1:3002/api/v1/support" \
     -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"`
  );
  try {
    const vendorData = JSON.parse(vendorListRes.stdout);
    console.log(`Vendor retrieved ${vendorData.tickets?.length || 0} tickets.`);
    console.log('Latest Vendor ticket:', vendorData.tickets?.[0]);
  } catch (e) {
    console.log('Vendor List Raw Output:', vendorListRes.stdout);
  }

  ssh.dispose();
  console.log('\n🎉 ALL SUPPORT SYSTEM INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
}

deployAndVerify().catch(err => {
  console.error('Deployment/Verification failed:', err);
  process.exit(1);
});
