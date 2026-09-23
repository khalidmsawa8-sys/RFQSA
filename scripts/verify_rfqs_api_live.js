const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/rfqs -H "Cookie: rfq_session=admin"');
  console.log('API response length:', res.stdout.length);
  try {
    const j = JSON.parse(res.stdout);
    console.log('Success:', j.success);
    console.log('Total RFQs count:', j.rfqs?.length);
    const reactivated = j.rfqs?.find((r) => r.id === 'RFQ-1153');
    console.log('RFQ-1153 details in API:');
    console.log(JSON.stringify(reactivated, null, 2));

    const openCount = j.rfqs?.filter((r) => r.status === 'open').length;
    console.log('Open RFQs count:', openCount);
  } catch (e) {
    console.log('Response head:', res.stdout.slice(0, 300));
  }

  const checkAdmin = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3002/admin/orders -H "Cookie: rfq_session=admin; rfq_user_id=admin-demo-id"');
  console.log('Admin orders HTTP code:', checkAdmin.stdout.trim());

  ssh.dispose();
}

main();
