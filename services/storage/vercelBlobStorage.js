const { put, head, del } = require('@vercel/blob');
const DATA_PATH = 'data/orders.json';
let queue = Promise.resolve();
async function readData() {
  try {
    const info = await head(DATA_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const response = await fetch(info.downloadUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Blob HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    if (/404|not found/i.test(e.message)) return { revision: 0, updatedAt: null, orders: [] };
    throw e;
  }
}
async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
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
  await put(pathname, buffer, {
    access: 'private',
    contentType,
    addRandomSuffix: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { storageType: 'vercel-blob', pathname, url: '', contentType, originalName };
}
async function getSlip(pathname) {
  const info = await head(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
  const response = await fetch(info.downloadUrl, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('ไม่สามารถอ่านสลิปได้');
  return { buffer: Buffer.from(await response.arrayBuffer()) };
}
async function deleteSlip(pathname) {
  await del(pathname, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
module.exports = { readData, update, saveSlip, getSlip, deleteSlip };
