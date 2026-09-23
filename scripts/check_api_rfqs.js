const { NodeSSH } = require('node-ssh');

async function main() {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
    tryKeyboard: true,
  });

  const res = await ssh.execCommand('curl -s http://127.0.0.1:3002/api/rfqs -H "Cookie: rfq_session=admin"');
  console.log('Status code/length:', res.stdout.length);
  try {
    const json = JSON.parse(res.stdout);
    console.log('Success:', json.success);
    console.log('Total RFQs from /api/rfqs:', json.rfqs ? json.rfqs.length : 'none');
    if (json.rfqs) {
      console.log('Sample RFQ 0:', JSON.stringify(json.rfqs[0], null, 2));
      console.log('Sample RFQ 1:', JSON.stringify(json.rfqs[1], null, 2));
    }
  } catch (e) {
    console.log('Not JSON:', res.stdout.slice(0, 300));
  }

  ssh.dispose();
}

main();
