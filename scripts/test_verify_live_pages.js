const { NodeSSH } = require("node-ssh");
const ssh = new NodeSSH();

async function test() {
  await ssh.connect({
    host: "147.93.56.252",
    username: "root",
    password: "MoNjiz@M2024",
    tryKeyboard: true,
  });

  const resClient = await ssh.execCommand('curl -s http://127.0.0.1:3002/client -H "Cookie: rfq_session=client; rfq_user_id=client-demo-id"');
  console.log("Client HTML length:", resClient.stdout.length);
  console.log("Client HTML contains Error:", resClient.stdout.includes("Application error"));
  console.log("Client title:", resClient.stdout.match(/<title>([^<]*)<\/title>/)?.[1]);
  console.log("Client has sidebar/header:", resClient.stdout.includes("DashboardHeader") || resClient.stdout.includes("rfqsa"));

  const resVendor = await ssh.execCommand('curl -s http://127.0.0.1:3002/vendor -H "Cookie: rfq_session=vendor; rfq_user_id=vendor-demo-id"');
  console.log("Vendor HTML length:", resVendor.stdout.length);
  console.log("Vendor HTML contains Error:", resVendor.stdout.includes("Application error"));
  console.log("Vendor title:", resVendor.stdout.match(/<title>([^<]*)<\/title>/)?.[1]);
  console.log("Vendor has sidebar/header:", resVendor.stdout.includes("DashboardHeader") || resVendor.stdout.includes("rfqsa"));

  ssh.dispose();
}
test();
