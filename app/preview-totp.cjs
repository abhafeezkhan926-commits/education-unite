const { createHmac } = require('node:crypto');

// Public RFC test key, used only by the loopback preview.
module.exports = function previewTotp() {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac('sha1', '12345678901234567890').update(counter).digest();
  return ((hash.readUInt32BE(hash[19] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
};
