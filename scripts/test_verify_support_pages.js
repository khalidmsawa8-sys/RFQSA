const { NodeSSH } = require('node-ssh');

async function testUrls() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const urls = [
    { name: 'Client Support List', url: 'http://127.0.0.1:3002/client/support', cookie: 'rfq_session=client; rfq_user_id=client-demo-id' },
    { name: 'Client Support Detail', url: 'http://127.0.0.1:3002/client/support/TKT-6891', cookie: 'rfq_session=client; rfq_user_id=client-demo-id' },
    { name: 'Vendor Support List', url: 'http://127.0.0.1:3002/vendor/support', cookie: 'rfq_session=vendor; rfq_user_id=vendor-demo-id' },
    { name: 'Vendor Support Detail', url: 'http://127.0.0.1:3002/vendor/support/TKT-6806', cookie: 'rfq_session=vendor; rfq_user_id=vendor-demo-id' },
    { name: 'Admin Support Dashboard', url: 'http://127.0.0.1:3002/admin/support', cookie: 'rfq_session=admin; rfq_user_id=admin-demo-id' },
  ];

  for (const u of urls) {
    const res = await ssh.execCommand(`curl -s -o /dev/null -w "%{http_code}" "${u.url}" -H "Cookie: ${u.cookie}"`);
    console.log(`[${u.name}] ${u.url} -> HTTP ${res.stdout.trim()}`);
  }
  ssh.dispose();
}

testUrls().catch(err => {
  console.error(err);
  process.exit(1);
});
