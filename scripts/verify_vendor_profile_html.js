const { NodeSSH } = require('node-ssh');

async function testHtml() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const script = `
    async function run() {
      // Fetch vendor settings page
      const res = await fetch('http://127.0.0.1:3002/vendor/settings?tab=pickup_location', {
        headers: { 'Cookie': 'rfq_session=vendor; rfq_user_id=vendor-demo-id; rfq_role=vendor' }
      });
      console.log('/vendor/settings?tab=pickup_location HTTP status for vendor:', res.status);
      const text = await res.text();
      console.log('Contains pickup_location:', text.includes('pickup_location'));
      console.log('Contains VendorBranchPickupSettings:', text.includes('VendorBranchPickupSettings'));
    }
    run().catch(console.error);
  `;
  const res = await ssh.execCommand(`node -e "${script.replace(/"/g, '\\"')}"`);
  console.log(res.stdout);
  if (res.stderr) console.log(res.stderr);
  ssh.dispose();
}

testHtml();
