const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: '147.93.56.252',
      username: 'root',
      password: 'MoNjiz@M2024',
    });

    const res = await ssh.execCommand(
      `curl -s -X POST -H "Content-Type: application/json" -d '{"rfq_visibility_duration_minutes": 2880}' http://127.0.0.1:3002/api/v1/admin/settings`
    );
    console.log("POST Result:", res.stdout);
  } catch (err) {
    console.error(err);
  } finally {
    ssh.dispose();
  }
}

test();
