const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fullTest() {
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });

  console.log('=== 1. FETCH INITIAL WALLET STATE ===');
  const r1 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/admin/wallet" -H "Cookie: rfq_session=admin" -H "x-admin-request: true"');
  const d1 = JSON.parse(r1.stdout);
  const targetBefore = d1.users.find(u => u.id === 'client-2');
  console.log('Client-2 Balance Before:', targetBefore.balance);
  console.log('Total Liquidity Before:', d1.stats.totalLiquidity);
  console.log('Total Credit Before:', d1.stats.totalCredit);

  console.log('\n=== 2. PERFORM DEPOSIT (إيداع 50 ر.س) ===');
  const depPayload = JSON.stringify({
    userId: 'client-2',
    type: 'credit',
    amount: 50,
    description: 'إيداع اختبار التحديث الحي'
  });
  const depRes = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -H "x-admin-request: true" -d '${depPayload}'`);
  console.log('Deposit Response:', depRes.stdout);

  console.log('\n=== 3. FETCH WALLET STATE AFTER DEPOSIT ===');
  const r2 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/admin/wallet" -H "Cookie: rfq_session=admin" -H "x-admin-request: true"');
  const d2 = JSON.parse(r2.stdout);
  const targetAfterDep = d2.users.find(u => u.id === 'client-2');
  console.log('Client-2 Balance After Deposit:', targetAfterDep.balance, '(Expected:', targetBefore.balance + 50, ')');
  console.log('Total Liquidity After Deposit:', d2.stats.totalLiquidity);
  console.log('Total Credit After Deposit:', d2.stats.totalCredit);

  console.log('\n=== 4. PERFORM DEDUCTION (خصم 50 ر.س) ===');
  const dedPayload = JSON.stringify({
    userId: 'client-2',
    type: 'debit',
    amount: 50,
    description: 'خصم اختبار التحديث الحي'
  });
  const dedRes = await ssh.execCommand(`curl -s -X POST "http://127.0.0.1:3002/api/v1/admin/wallet/adjust" -H "Content-Type: application/json" -H "Cookie: rfq_session=admin" -H "x-admin-request: true" -d '${dedPayload}'`);
  console.log('Deduction Response:', dedRes.stdout);

  console.log('\n=== 5. FETCH WALLET STATE AFTER DEDUCTION ===');
  const r3 = await ssh.execCommand('curl -s "http://127.0.0.1:3002/api/v1/admin/wallet" -H "Cookie: rfq_session=admin" -H "x-admin-request: true"');
  const d3 = JSON.parse(r3.stdout);
  const targetAfterDed = d3.users.find(u => u.id === 'client-2');
  console.log('Client-2 Balance After Deduction:', targetAfterDed.balance, '(Expected:', targetBefore.balance, ')');
  console.log('Total Liquidity After Deduction:', d3.stats.totalLiquidity);
  console.log('Total Debit After Deduction:', d3.stats.totalDebit);

  ssh.dispose();
}
fullTest().catch(console.error);
