const { randomUUID } = require('crypto');
const product = require('../config/product.json');
const storageFactory = require('./storage');
const generateOrderNumber = require('../utils/generateOrderNumber');
const STATUSES = [
  'pending_payment_verification',
  'paid',
  'preparing',
  'shipping',
  'completed',
  'payment_rejected',
  'cancelled',
];
function calculateTotal(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > product.maxQuantity)
    throw new Error('จำนวนสินค้าไม่ถูกต้อง');
  return quantity * product.price;
}

function buildItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > product.sizes.length) {
    throw new Error('รายการสินค้าไม่ถูกต้อง');
  }

  const quantitiesBySize = new Map();
  for (const rawItem of rawItems) {
    const size = String(rawItem.size || '');
    const quantity = Number(rawItem.quantity);
    if (!validSize(size)) throw new Error('ไซซ์ไม่ถูกต้อง');
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('จำนวนสินค้าไม่ถูกต้อง');
    quantitiesBySize.set(size, (quantitiesBySize.get(size) || 0) + quantity);
  }

  const totalQuantity = [...quantitiesBySize.values()].reduce((sum, quantity) => sum + quantity, 0);
  if (totalQuantity > product.maxQuantity) throw new Error('จำนวนสินค้ารวมเกินกำหนด');

  return [...quantitiesBySize.entries()].map(([size, quantity]) => ({
    productName: product.name,
    size,
    quantity,
    unitPrice: product.price,
    subtotal: quantity * product.price,
  }));
}

function calculateItemsTotal(items) {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}
function validSize(size) {
  return product.sizes.some((s) => s.name === size);
}
async function list() {
  return (await storageFactory().readData()).orders;
}
async function findById(id) {
  return (await list()).find((o) => o.id === id);
}
async function findByOrderNumber(n) {
  return (await list()).find((o) => o.orderNumber === n);
}
async function create(input, file) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const items = buildItems(input.items);
  const total = calculateItemsTotal(items);
  let slip;
  try {
    slip = await storageFactory().saveSlip({
      buffer: file.buffer,
      orderId: id,
      extension: file.safeExtension,
      contentType: file.mimetype,
      originalName: file.originalname,
    });
    const order = {
      id,
      orderNumber: generateOrderNumber(),
      customer: input.customer,
      items,
      totalAmount: total,
      note: input.note || '',
      paymentSlip: slip,
      paymentStatus: 'pending_verification',
      shippingStatus: 'waiting',
      orderStatus: 'pending_payment_verification',
      statusHistory: [
        { status: 'pending_payment_verification', changedAt: now, changedBy: 'system' },
      ],
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    };
    await storageFactory().update((data) => {
      data.orders.push(order);
    });
    return order;
  } catch (e) {
    if (slip) await storageFactory().deleteSlip(slip.pathname);
    throw e;
  }
}
async function updateStatus(id, status, username) {
  if (!STATUSES.includes(status)) throw new Error('สถานะไม่ถูกต้อง');
  let found;
  await storageFactory().update((data) => {
    found = data.orders.find((o) => o.id === id);
    if (!found) return;
    const now = new Date().toISOString();
    found.orderStatus = status;
    found.paymentStatus =
      status === 'paid' ? 'paid' : status === 'payment_rejected' ? 'rejected' : found.paymentStatus;
    found.shippingStatus =
      status === 'shipping'
        ? 'shipping'
        : status === 'completed'
          ? 'completed'
          : found.shippingStatus;
    found.statusHistory.push({ status, changedAt: now, changedBy: username });
    found.updatedAt = now;
  });
  return found;
}
async function updateNote(id, note) {
  let found;
  await storageFactory().update((data) => {
    found = data.orders.find((o) => o.id === id);
    if (found) {
      found.adminNote = note;
      found.updatedAt = new Date().toISOString();
    }
  });
  return found;
}
module.exports = {
  STATUSES,
  calculateTotal,
  buildItems,
  calculateItemsTotal,
  validSize,
  list,
  findById,
  findByOrderNumber,
  create,
  updateStatus,
  updateNote,
};
