const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const resClient = await ssh.execCommand('curl -s "http://127.0.0.1:3002/client/support" -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"');
  console.log('[Client Support] Length:', resClient.stdout.length, '| Has error:', resClient.stdout.includes('Application error'), '| Has title:', resClient.stdout.includes('المساعدة'));

  const resVendor = await ssh.execCommand('curl -s "http://127.0.0.1:3002/vendor/support" -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"');
  console.log('[Vendor Support] Length:', resVendor.stdout.length, '| Has error:', resVendor.stdout.includes('Application error'), '| Has title:', resVendor.stdout.includes('مركز الدعم والمساعدة للموردين'));
  ssh.dispose();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
