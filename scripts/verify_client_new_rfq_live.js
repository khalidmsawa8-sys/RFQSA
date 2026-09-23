const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const cmd = `curl -i -s -H "Cookie: rfq_session=client; rfq_role=client_owner; rfq_user_id=client-demo-id" http://127.0.0.1:3002/client/new-rfq`;
  const res = await ssh.execCommand(cmd);
  const statusLine = res.stdout.split('\n')[0];
  console.log('Status line:', statusLine);
  console.log('Page Length:', res.stdout.length);
  console.log('Contains HTML:', res.stdout.includes('<!DOCTYPE html>'));

  ssh.dispose();
}

verify().catch(console.error);
