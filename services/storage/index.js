let instance;
module.exports = function getStorage() {
  if (instance) return instance;
  // A Vercel Function must not persist orders on its ephemeral local filesystem.
  // Select Blob automatically there, while keeping local storage for development.
  const driver = process.env.STORAGE_DRIVER || (process.env.VERCEL ? 'vercel-blob' : 'local');
  if (driver === 'local') instance = require('./localStorage');
  else if (driver === 'vercel-blob') {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error(
        'Vercel Blob is not configured: connect a Blob store and set BLOB_READ_WRITE_TOKEN',
      );
    }
    instance = require('./vercelBlobStorage');
  }
  else throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  return instance;
};
module.exports.reset = () => {
  instance = undefined;
};
