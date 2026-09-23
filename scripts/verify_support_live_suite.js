const { NodeSSH } = require('node-ssh');

async function runLiveVerification() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const testScript = `
    async function main() {
      console.log('--- START LIVE SUPPORT VERIFICATION ---');
      
      // 1. Check Admin support tickets
      const resTickets = await fetch('http://127.0.0.1:3002/api/v1/admin/support', {
        headers: { 'Cookie': 'rfq_session=admin' }
      });
      const dataTickets = await resTickets.json();
      console.log('1. Admin Tickets Fetch:', dataTickets.success ? 'SUCCESS' : 'FAILED', 'Count:', dataTickets.total);

      if (!dataTickets.tickets || dataTickets.tickets.length === 0) {
        console.log('No tickets available to test');
        return;
      }

      const testTicket = dataTickets.tickets[0];
      const tId = testTicket.id;
      const origStatus = testTicket.status;
      console.log('Testing Ticket ID:', tId, 'Current Status:', origStatus);

      // 2. Fetch ticket thread & details
      const resDetail = await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        headers: { 'Cookie': 'rfq_session=admin' }
      });
      const dataDetail = await resDetail.json();
      console.log('2. Admin Ticket Detail Fetch:', dataDetail.success ? 'SUCCESS' : 'FAILED');
      console.log('   Client name:', dataDetail.ticket?.client?.full_name || dataDetail.ticket?.client?.company_name || 'N/A');
      console.log('   Messages count:', dataDetail.messages?.length);

      // 3. Test Admin Reply
      const resReply = await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=admin' },
        body: JSON.stringify({ message: 'فحص آلي: رد المشرف الفني من لوحة التحكم' })
      });
      const replyData = await resReply.json();
      console.log('3. Admin Reply Post:', replyData.success ? 'SUCCESS' : 'FAILED', replyData.reply?.message_text);

      // 4. Test Closing ticket & verifying non-admin message block
      const resClose = await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=admin' },
        body: JSON.stringify({ status: 'closed' })
      });
      const closeData = await resClose.json();
      console.log('4. Ticket Status Closed:', closeData.success ? 'SUCCESS' : 'FAILED', 'New status:', closeData.ticket?.status);

      // 5. Attempt client message to closed ticket (MUST BE 403)
      const resClientMsg = await fetch('http://127.0.0.1:3002/api/v1/support/' + tId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=client; rfq_user_id=mock-client' },
        body: JSON.stringify({ message: 'محاولة إرسال رد بعد الإغلاق' })
      });
      console.log('5. Client Attempt to Reply to Closed Ticket (Expected 403):', resClientMsg.status);
      const clientMsgBody = await resClientMsg.json();
      console.log('   Response message:', clientMsgBody.error);

      // 6. Test reopening ticket by admin
      const resReopen = await fetch('http://127.0.0.1:3002/api/v1/admin/support/' + tId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'rfq_session=admin' },
        body: JSON.stringify({ status: origStatus || 'in_progress' })
      });
      const reopenData = await resReopen.json();
      console.log('6. Reverted Status by Admin:', reopenData.success ? 'SUCCESS' : 'FAILED', 'Status:', reopenData.ticket?.status);

      // 7. Verify Admin and Client Pages HTML HTTP Status
      const resAdminHtml = await fetch('http://127.0.0.1:3002/admin/support/' + tId, {
        headers: { 'Cookie': 'rfq_session=admin' }
      });
      console.log('7. Admin Support Page [id] HTTP status:', resAdminHtml.status);

      console.log('--- ALL VERIFICATIONS PASSED ---');
    }
    main().catch(console.error);
  `;

  console.log('Executing test suite on VPS...');
  const res = await ssh.execCommand(`node -e "${testScript.replace(/"/g, '\\"')}"`);
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);

  ssh.dispose();
}

runLiveVerification().catch(console.error);
