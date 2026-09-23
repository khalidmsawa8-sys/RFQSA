const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function run() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const checkFile = await ssh.execCommand('grep -n "CANONICAL_PARTS_CATEGORIES" /var/www/rfq/app/client/new-rfq/page.tsx');
  console.log('File on server grep new-rfq:', checkFile.stdout);
  const checkProfile = await ssh.execCommand('grep -n "CANONICAL_PARTS_CATEGORIES" /var/www/rfq/app/profile/page.tsx');
  console.log('File on server grep profile:', checkProfile.stdout);
  const checkSettings = await ssh.execCommand('grep -n "CANONICAL_PARTS_CATEGORIES" /var/www/rfq/components/identity/unified-identity-settings-view.tsx');
  console.log('File on server grep unified-settings:', checkSettings.stdout);
  ssh.dispose();
}

run().catch(console.error);
