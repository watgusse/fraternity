const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const dataFile = path.join(__dirname, '..', '..', 'data', 'orders.json');
const slipDir = path.join(__dirname, '..', '..', 'uploads', 'slips');
let queue = Promise.resolve();
async function ensure() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.mkdir(slipDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(
      dataFile,
      JSON.stringify({ revision: 0, updatedAt: null, orders: [] }, null, 2),
    );
  }
}
async function readData() {
  await ensure();
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'));
  } catch (e) {
    throw new Error(`อ่านไฟล์ orders.json ไม่สำเร็จ: ${e.message}`);
  }
}
async function writeData(data) {
  await ensure();
  const temp = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temp, dataFile);
}
function update(mutator) {
  const job = queue.then(async () => {
    const latest = await readData();
    const result = await mutator(latest);
    latest.revision = (latest.revision || 0) + 1;
    latest.updatedAt = new Date().toISOString();
    await writeData(latest);
    return result;
  });
  queue = job.catch(() => {});
  return job;
}
async function saveSlip({ buffer, orderId, extension, contentType, originalName }) {
  await ensure();
  const filename = `${orderId}-${Date.now()}-${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(slipDir, filename), buffer, { flag: 'wx' });
  return { storageType: 'local', pathname: filename, url: '', contentType, originalName };
}
async function getSlip(pathname) {
  const safe = path.basename(pathname);
  if (safe !== pathname) throw new Error('Invalid slip path');
  return { buffer: await fs.readFile(path.join(slipDir, safe)) };
}
async function deleteSlip(pathname) {
  const safe = path.basename(pathname);
  if (safe === pathname) await fs.unlink(path.join(slipDir, safe)).catch(() => {});
}
module.exports = { readData, update, saveSlip, getSlip, deleteSlip, _writeData: writeData };
