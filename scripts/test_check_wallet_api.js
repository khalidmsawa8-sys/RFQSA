const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testAdminWithHeader() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024'
  });

  const resAdmin = await ssh.execCommand("curl -s -H 'x-admin-request: true' 'http://127.0.0.1:3002/api/v1/admin/wallet'");
  const adminData = JSON.parse(resAdmin.stdout);
  console.log('Admin Users count:', adminData.users?.length);
  console.log('Admin Transactions count:', adminData.transactions?.length);
  if (adminData.transactions && adminData.transactions.length > 0) {
    console.log('\nSample Admin Transactions:');
    adminData.transactions.slice(0, 8).forEach(t => {
      console.log(` - Ref: ${t.reference} | Invoice: ${t.invoice_number || '-'} | Amount: ${t.amount} | Type: ${t.type} | User: ${t.profiles?.full_name}`);
    });
  }

  ssh.dispose();
}

testAdminWithHeader().catch(console.error);
