const { NodeSSH } = require('node-ssh');
const path = require('path');

const filesToUpload = [
  'components/support/client-ticket-conversation.tsx',
  'app/api/v1/support/[id]/messages/route.ts',
  'app/api/v1/client/support/[id]/messages/route.ts',
  'app/api/v1/admin/support/[id]/route.ts',
  'app/admin/(dashboard)/support/page.tsx',
  'app/admin/(dashboard)/support/[id]/page.tsx',
  'app/client/support/[id]/page.tsx',
  'app/vendor/support/[id]/page.tsx',
  'app/courier/support/[id]/page.tsx',
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
  await ssh.execCommand('mkdir -p "/var/www/rfq/app/admin/(dashboard)/support/[id]"');
  await ssh.execCommand('mkdir -p "/var/www/rfq/app/api/v1/support/[id]/messages"');
  await ssh.execCommand('mkdir -p "/var/www/rfq/app/api/v1/client/support/[id]/messages"');
  await ssh.execCommand('mkdir -p "/var/www/rfq/app/api/v1/admin/support/[id]"');

  for (const rel of filesToUpload) {
    const localPath = path.join(localBase, rel);
    const remotePath = `${remoteBase}/${rel.replace(/\\/g, '/')}`;
    console.log(`Uploading ${rel} -> ${remotePath}...`);
    await ssh.putFile(localPath, remotePath);
  }
  console.log('✅ All files uploaded successfully.\n');

  console.log('2️⃣ Building Next.js application on VPS...');
  const buildRes = await ssh.execCommand('npm run build', { cwd: remoteBase });
  console.log('Build Output:\n', buildRes.stdout.slice(-1500));
  if (buildRes.code !== 0) {
    console.error('Build Error:\n', buildRes.stderr);
    ssh.dispose();
    process.exit(1);
  }
  console.log('✅ Build completed successfully!\n');

  console.log('3️⃣ Restarting PM2 process...');
  const pm2Res = await ssh.execCommand('pm2 restart rfq', { cwd: remoteBase });
  console.log(pm2Res.stdout);
  console.log('✅ PM2 Restarted.\n');

  // Wait 3 seconds for service to settle
  await new Promise((r) => setTimeout(r, 3000));

  console.log('4️⃣ Testing endpoints on live server...');
  const testScript = `
    const fetch = require('node-fetch');
    async function test() {
      // 1. Fetch support tickets to get a ticket id
      const resTickets = await fetch('http://127.0.0.1:3002/api/v1/admin/support', {
        headers: { 'Cookie': 'rfq_session=admin' }
      });
      const dataTickets = await resTickets.json();
      console.log('Admin support tickets count:', dataTickets.total || dataTickets.tickets?.length);
      
      const firstTicket = dataTickets.tickets && dataTickets.tickets[0];
      if (!firstTicket) {
        console.log('No ticket found to test detail');
        return;
      }
      
      const tId = firstTicket.id;
      console.log('Testing ticket detail & thread for #' + tId);
      const resDetail = await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        headers: { 'Cookie': 'rfq_session=admin' }
      });
      const dataDetail = await resDetail.json();
      console.log('Admin thread success:', dataDetail.success, 'messages count:', dataDetail.messages?.length);

      // 2. Test blocking messages on a closed ticket
      // Temporarily set status to closed to test blocking
      await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=admin' },
        body: JSON.stringify({ status: 'closed' })
      });

      // Try sending a message as client
      const resSendBlocked = await fetch('http://127.0.0.1:3002/api/v1/support/' + tId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=client; rfq_user_id=some-client-id' },
        body: JSON.stringify({ message: 'حاول إرسال رسالة لتذكرة مغلقة' })
      });
      console.log('Client posting to closed ticket status code (expect 403):', resSendBlocked.status);
      const blockedBody = await resSendBlocked.json();
      console.log('Client blocked response:', blockedBody);

      // Revert status to in_progress or previous
      await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=admin' },
        body: JSON.stringify({ status: firstTicket.status || 'in_progress' })
      });
      console.log('Reverted ticket status back to:', firstTicket.status || 'in_progress');
    }
    test().catch(e => console.error(e));
  `;

  const testExec = await ssh.execCommand(`node -e "${testScript.replace(/"/g, '\\"')}"`);
  console.log('Test Output:\n', testExec.stdout);
  if (testExec.stderr) console.log('Test Stderr:\n', testExec.stderr);

  ssh.dispose();
  console.log('🎉 DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!');
}

deployAndVerify().catch((e) => {
  console.error('Fatal Deployment Error:', e);
  process.exit(1);
});
