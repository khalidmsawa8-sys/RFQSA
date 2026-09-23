const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testAll() {
  await ssh.connect({
    host: '147.93.56.252',
    username: 'root',
    password: 'MoNjiz@M2024',
  });

  const tests = [
    { id: 'vendor@rfqsa.tech', p: '123456' },
    { id: 'vendor', p: '123456' },
    { id: '0551122334', p: '123456' },
    { id: 'VND-501', p: '123456' },
    { id: 'vendor@rfqsa.tech', p: 'P@ssword123' },
  ];

  for (const t of tests) {
    const cmd = `curl -s -X POST http://127.0.0.1:3002/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"${t.id}","password":"${t.p}"}'`;
    const res = await ssh.execCommand(cmd);
    try {
      const d = JSON.parse(res.stdout);
      console.log(`✅ [${t.id}] with [${t.p}] -> success: ${d.success}, role: ${d.user?.role}, roleId: ${d.user?.roleId}, redirect: ${d.redirectUrl}`);
    } catch (e) {
      console.log(`❌ [${t.id}] with [${t.p}] -> Failed to parse:`, res.stdout);
    }
  }

  ssh.dispose();
}

testAll().catch(console.error);
