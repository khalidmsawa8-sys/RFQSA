const path = require('path');
const { Client } = require('ssh2');

const config = {
  host: '147.93.56.252',
  port: 22,
  username: 'root',
  password: 'MoNjiz@M2024',
};

const localDir = __dirname;
const conn = new Client();

conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(path.join(localDir, 'remote_inspect.js'), '/root/remote_inspect.js', (pErr) => {
      if (pErr) throw pErr;
      conn.exec('node /root/remote_inspect.js', (execErr, stream) => {
        stream.on('close', () => {
          conn.end();
          process.exit(0);
        });
        stream.on('data', d => process.stdout.write(d.toString()));
        stream.stderr.on('data', d => process.stderr.write(d.toString()));
      });
    });
  });
});

conn.connect(config);
