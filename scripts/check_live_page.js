const { NodeSSH } = require('node-ssh');

async function check() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });

    console.log('--- Checking /var/www/rfq/components/admin/admin-sidebar-nav.tsx ---');
    const sidebar = await ssh.execCommand('cat /var/www/rfq/components/admin/admin-sidebar-nav.tsx');
    console.log(sidebar.stdout);

    console.log('\n--- Reloading Nginx if needed ---');
    const nginxRes = await ssh.execCommand('systemctl reload nginx');
    console.log('Nginx reload:', nginxRes.stderr || 'OK');

  } catch (err) {
    console.error(err);
  } finally {
    ssh.dispose();
  }
}

check();
