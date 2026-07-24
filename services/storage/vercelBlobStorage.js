const { put, get, del } = require('@vercel/blob');

const DATA_PATH = 'data/orders.json';
let queue = Promise.resolve();

async function readData() {
  const result = await get(DATA_PATH, { access: 'private', useCache: false });
  if (!result) return { revision: 0, updatedAt: null, orders: [] };
  return new Response(result.stream).json();
}

async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

function update(mutator) {
  const job = queue.then(async () => {
    const latest = await readData();
    const startRevision = latest.revision || 0;
    const result = await mutator(latest);
    latest.revision = startRevision + 1;
    latest.updatedAt = new Date().toISOString();
    await writeData(latest);
    return result;
  });
  queue = job.catch(() => {});
  return job;
}

async function saveSlip({ buffer, orderId, extension, contentType, originalName }) {
  const pathname = `slips/${orderId}-${Date.now()}.${extension}`;
  const blob = await put(pathname, buffer, {
    access: 'private',
    contentType,
    addRandomSuffix: true,
  });
  return {
    storageType: 'vercel-blob',
    pathname: blob.pathname,
    url: '',
    contentType,
    originalName,
  };
}

async function getSlip(pathname) {
  const result = await get(pathname, { access: 'private' });
  if (!result) throw new Error('Payment slip not found');
  return { buffer: Buffer.from(await new Response(result.stream).arrayBuffer()) };
}

async function deleteSlip(pathname) {
  await del(pathname);
}

module.exports = { readData, update, saveSlip, getSlip, deleteSlip };
