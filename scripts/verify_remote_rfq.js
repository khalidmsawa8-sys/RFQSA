const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- CHECKING BUILD ASSETS FOR BRANCH DROPDOWN ---');
  const res = await ssh.execCommand('grep -rn "فروع الشركة المسجلة (ابحث أو اختر من القائمة المنسدلة)" /var/www/rfq/.next/');
  console.log('Build matches found:', res.stdout ? 'YES' : 'NO');
  if (res.stdout) {
    console.log(res.stdout.substring(0, 300));
  }

  const res2 = await ssh.execCommand('grep -rn "البحث واختيار الفرع من فروع الشركة المسجلة" /var/www/rfq/.next/');
  console.log('Input label matches found:', res2.stdout ? 'YES' : 'NO');

  const res3 = await ssh.execCommand('grep -rn "معلومات الفرع المعتمد للتسليم" /var/www/rfq/.next/');
  console.log('Confirmation card matches found:', res3.stdout ? 'YES' : 'NO');

  ssh.dispose();
}

verify();
