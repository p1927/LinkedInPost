// test-connectivity.js — usage: node scripts/test-connectivity.js <host> [port]
const net = require('net');
const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '8787', 10);
const client = net.connect(port, host, () => {
  console.log('CONNECTED');
  client.end();
  process.exit(0);
});
client.on('error', (e) => {
  console.error('UNREACHABLE: ' + e.message);
  process.exit(1);
});
