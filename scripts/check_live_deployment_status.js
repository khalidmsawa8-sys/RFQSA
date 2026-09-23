const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function check() {
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });

    const pm2 = await ssh.execCommand('pm2 jlist');
    const apps = JSON.parse(pm2.stdout || '[]');
    const rfqApp = apps.find(a => a.name === 'rfq');

    console.log('App name:', rfqApp?.name);
    console.log('Status:', rfqApp?.pm2_env?.status);
    console.log('Uptime (restart count):', rfqApp?.pm2_env?.restart_time);
    console.log('PID:', rfqApp?.pid);

    const files = await ssh.execCommand('ls -lh /var/www/rfq/app/deal/\\[orderId\\]/deal-page-client.tsx /var/www/rfq/app/client/orders/orders-client.tsx /var/www/rfq/components/dashboard/slide-dashboard.tsx');
    console.log('\nUpdated Files on Server:\n' + files.stdout);

    const verifyStages = await ssh.execCommand('node -e "const fs = require(\'fs\'); const content = fs.readFileSync(\'/var/www/rfq/app/deal/[orderId]/deal-page-client.tsx\', \'utf8\'); console.log(\'Contains 4-stage calculation:\', content.includes(\'liveStatus === \\"ready\\" || liveStatus === \\"shipped\\"\'));"');
    console.log('\nCode content check:\n' + verifyStages.stdout);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    ssh.dispose();
  }
}

check();
