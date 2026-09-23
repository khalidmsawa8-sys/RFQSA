const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testCreateRfqWithCategory() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  console.log('--- 1. Login as Client ---');
  const loginRes = await ssh.execCommand('curl -i -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d \'{"identifier":"client@rfqsa.tech","password":"123456"}\'');
  const cookies = loginRes.stdout.match(/set-cookie: ([^;\r\n]+)/gi);
  if (!cookies) {
    console.error('Failed to get session cookie from login');
    ssh.dispose();
    return;
  }
  const cookieHeader = cookies.map(c => c.replace(/set-cookie:\s*/i, '')).join('; ');

  console.log('--- 2. POST /api/rfqs with cooling_ac category ---');
  const rfqPayload = JSON.stringify({
    carMake: "تويوتا",
    carModel: "كامري",
    carYear: 2024,
    partsCategory: "cooling_ac",
    partsCategoryName: "التبريد ومكيف السيارة والراديترات",
    rfqType: "public",
    partsList: [
      {
        name: "كمبروسر مكيف دينسو",
        partNumber: "88320-33200",
        partType: "original",
        quantity: 1,
        category: "cooling_ac",
        notes: "تبريد عالي جودة وكالة"
      }
    ]
  });

  const postRfq = await ssh.execCommand(`curl -s -X POST -H "Cookie: ${cookieHeader}" -H "Content-Type: application/json" -d '${rfqPayload}' http://127.0.0.1:3002/api/rfqs`);
  console.log('Create RFQ Response:', postRfq.stdout);

  let rfqId;
  try {
    const parsed = JSON.parse(postRfq.stdout);
    rfqId = parsed.rfq?.id;
    console.log(`Created RFQ ID: ${rfqId}`);
  } catch (e) {
    console.error('Failed to parse RFQ response');
  }

  if (rfqId) {
    console.log('--- 3. Verify RFQ via GET /api/rfqs ---');
    const getRfqs = await ssh.execCommand(`curl -s -H "Cookie: ${cookieHeader}" http://127.0.0.1:3002/api/rfqs`);
    const allRfqs = JSON.parse(getRfqs.stdout);
    const found = (allRfqs.rfqs || []).find(r => r.id === rfqId);
    console.log('Found RFQ:', found ? {
      id: found.id,
      car_make: found.car_make,
      parts_category: found.parts_category,
      parts_category_name: found.parts_category_name,
    } : 'Not found in list');
  }

  ssh.dispose();
  console.log('✅ Create RFQ with category test completed successfully!');
}

testCreateRfqWithCategory().catch(err => {
  console.error(err);
  process.exit(1);
});
