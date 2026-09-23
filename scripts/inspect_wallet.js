const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function main() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024'
  });

  const res1 = await ssh.execCommand('cat /var/www/rfq/data/wallet_transactions_db.json');
  const allTxs = JSON.parse(res1.stdout);
  console.log('Total transactions in DB:', allTxs.length);
  
  const clientTxs = allTxs.filter(t => t.user_id === 'client-demo-id');
  console.log('Client transactions count:', clientTxs.length);
  console.log('Client transactions sample (first 3):', JSON.stringify(clientTxs.slice(0, 3), null, 2));

  const vendorTxs = allTxs.filter(t => t.user_id === 'vendor-demo-id');
  console.log('Vendor transactions count:', vendorTxs.length);
  console.log('Vendor transactions sample (first 5):', JSON.stringify(vendorTxs, null, 2));

  ssh.dispose();
}

main().catch(console.error);
