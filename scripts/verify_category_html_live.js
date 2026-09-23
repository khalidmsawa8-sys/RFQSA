const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verifyHtmlLive() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Login as Vendor and check /vendor/settings and /profile HTML ---');
  const vLogin = await ssh.execCommand('curl -i -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"vendor@rfqsa.tech","password":"123456"}\'');
  const vCookies = vLogin.stdout.match(/set-cookie: ([^;\r\n]+)/gi);
  const vCookieHeader = vCookies ? vCookies.map(c => c.replace(/set-cookie:\s*/i, '')).join('; ') : '';

  const profileHtml = await ssh.execCommand(`curl -s -H "Cookie: ${vCookieHeader}" http://127.0.0.1:3002/profile`);
  console.log('Profile HTML length:', profileHtml.stdout.length);
  const hasCategoryTab = profileHtml.stdout.includes('مجالات وتخصصات قطع الغيار');
  const hasCooling = profileHtml.stdout.includes('التبريد ومكيف السيارة');
  const hasBrakes = profileHtml.stdout.includes('نظام الفرامل والمكابح');
  console.log('Profile has "مجالات وتخصصات قطع الغيار":', hasCategoryTab);
  console.log('Profile has "التبريد ومكيف السيارة":', hasCooling);
  console.log('Profile has "نظام الفرامل والمكابح":', hasBrakes);

  console.log('\n--- 2. Login as Client and check /client/new-rfq HTML ---');
  const cLogin = await ssh.execCommand('curl -i -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"client@rfqsa.tech","password":"123456"}\'');
  const cCookies = cLogin.stdout.match(/set-cookie: ([^;\r\n]+)/gi);
  const cCookieHeader = cCookies ? cCookies.map(c => c.replace(/set-cookie:\s*/i, '')).join('; ') : '';

  const rfqHtml = await ssh.execCommand(`curl -s -H "Cookie: ${cCookieHeader}" http://127.0.0.1:3002/client/new-rfq`);
  console.log('New RFQ HTML length:', rfqHtml.stdout.length);
  const hasRfqCategoryCard = rfqHtml.stdout.includes('مجال وتخصص قطع الغيار');
  console.log('New RFQ has "مجال وتخصص قطع الغيار":', hasRfqCategoryCard);

  ssh.dispose();
  console.log('\n✅ Live HTML inspection completed!');
}

verifyHtmlLive().catch(err => {
  console.error(err);
  process.exit(1);
});
