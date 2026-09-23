const { NodeSSH } = require('node-ssh');

async function test() {
  const ssh = new NodeSSH();
  await ssh.connect({ host: '147.93.56.252', username: 'root', password: 'MoNjiz@M2024' });
  const script = `
    async function run() {
      const res = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches');
      const data = await res.json();
      console.log('Branches count:', data.branches?.length);
      console.log('First branch:', data.branches[0]);

      // Add a test branch first
      const addRes = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'فرع تجريبي للحذف',
          city: 'الرياض',
          address: 'شارع التجربة',
          latitude: 24.7,
          longitude: 46.7,
          is_main: false
        })
      });
      const addData = await addRes.json();
      console.log('Add response:', addData);

      const toDeleteId = addData.branch?.id;
      console.log('Attempting to delete newly created branch:', toDeleteId);

      const delRes = await fetch('http://127.0.0.1:3002/api/v1/vendor/branches?id=' + toDeleteId, { method: 'DELETE' });
      console.log('Delete status:', delRes.status, await delRes.json());
    }
    run().catch(console.error);
  `;
  const res = await ssh.execCommand(`node -e "${script.replace(/"/g, '\\"')}"`);
  console.log(res.stdout);
  if (res.stderr) console.log(res.stderr);
  ssh.dispose();
}

test();
