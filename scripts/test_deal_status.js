const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
(async () => {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const script = `
const res = await ssh.execCommand("curl -s -H 'Cookie: rfq_session=client; rfq_role=client; rfq_user_id=client-demo-id' http://localhost:3002/deal/DEAL-1123");
console.log('HTML length:', res.stdout.length);
const matches = res.stdout.match(/.{0,40}(?:تم التجهيز|تم الشحن|جاري التسليم|تأكيد واستلام|قيد التجهيز).{0,40}/g);
console.log('Matches:', matches ? matches.slice(0, 10) : 'None');
`;
  const res = await ssh.execCommand(`curl -s -H "Cookie: rfq_session=client; rfq_role=client; rfq_user_id=client-demo-id" http://localhost:3002/deal/DEAL-1123`);
  console.log('Length:', res.stdout.length);
  const regex = /.{0,30}(?:تم التجهيز|تم الشحن|جاري التسليم|قيد التجهيز).{0,30}/g;
  let m;
  while ((m = regex.exec(res.stdout)) !== null) {
    console.log('FOUND:', m[0]);
  }
  ssh.dispose();
})();
