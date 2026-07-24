let instance;
module.exports = function getStorage() {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER || 'local';
  if (driver === 'local') instance = require('./localStorage');
  else if (driver === 'vercel-blob') instance = require('./vercelBlobStorage');
  else throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  return instance;
};
module.exports.reset = () => {
  instance = undefined;
};
