const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  
  // Test Technician HTML
  const techHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/client" -H "Cookie: rfq_session=client; rfq_role=client_technician"');
  const hasWalletInTech = techHtml.stdout.includes('/client/wallet');
  const hasInvoicesInTech = techHtml.stdout.includes('/client/invoices');
  const hasRolesInTech = techHtml.stdout.includes('/client/roles');
  const hasGarageInTech = techHtml.stdout.includes('/client/garage');
  const hasNewRfqInTech = techHtml.stdout.includes('/client/new-rfq');
  
  console.log('--- TECHNICIAN HTML CHECKS ---');
  console.log('Has /client/wallet (expected FALSE):', hasWalletInTech);
  console.log('Has /client/invoices (expected FALSE):', hasInvoicesInTech);
  console.log('Has /client/roles (expected FALSE):', hasRolesInTech);
  console.log('Has /client/garage (expected FALSE):', hasGarageInTech);
  console.log('Has /client/new-rfq (expected TRUE):', hasNewRfqInTech);
  
  // Test Vendor Warehouse Clerk HTML
  const clerkHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/vendor" -H "Cookie: rfq_session=vendor; rfq_role=vendor_warehouse_clerk"');
  const hasRadarInClerk = clerkHtml.stdout.includes('/vendor/radar');
  const hasWalletInClerk = clerkHtml.stdout.includes('/vendor/wallet');
  const hasInvoicesInClerk = clerkHtml.stdout.includes('/vendor/invoices');
  const hasRolesInClerk = clerkHtml.stdout.includes('/vendor/roles');
  const hasOrdersInClerk = clerkHtml.stdout.includes('/vendor/orders');

  console.log('\n--- VENDOR WAREHOUSE CLERK HTML CHECKS ---');
  console.log('Has /vendor/radar (expected FALSE):', hasRadarInClerk);
  console.log('Has /vendor/wallet (expected FALSE):', hasWalletInClerk);
  console.log('Has /vendor/invoices (expected FALSE):', hasInvoicesInClerk);
  console.log('Has /vendor/roles (expected FALSE):', hasRolesInClerk);
  console.log('Has /vendor/orders (expected TRUE):', hasOrdersInClerk);

  // Test Vendor Owner HTML
  const vendorOwnerHtml = await ssh.execCommand('curl -s "http://127.0.0.1:3002/vendor" -H "Cookie: rfq_session=vendor"');
  const hasRadarInOwner = vendorOwnerHtml.stdout.includes('/vendor/radar');
  const hasWalletInVendorOwner = vendorOwnerHtml.stdout.includes('/vendor/wallet');
  const hasRolesInVendorOwner = vendorOwnerHtml.stdout.includes('/vendor/roles');

  console.log('\n--- VENDOR OWNER HTML CHECKS ---');
  console.log('Vendor Owner has /vendor/radar (expected TRUE):', hasRadarInOwner);
  console.log('Vendor Owner has /vendor/wallet (expected TRUE):', hasWalletInVendorOwner);
  console.log('Vendor Owner has /vendor/roles (expected TRUE):', hasRolesInVendorOwner);

  ssh.dispose();
}

run();

