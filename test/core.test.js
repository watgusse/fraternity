const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const orderService = require('../services/orderService');
const generate = require('../utils/generateOrderNumber');
const { validateFile } = require('../middleware/upload');
test('คำนวณยอดรวมจาก server', () => assert.equal(orderService.calculateTotal(2), 1100));
test('ปฏิเสธจำนวนนอกช่วง', () => {
  assert.throws(() => orderService.calculateTotal(0));
  assert.throws(() => orderService.calculateTotal(21));
});
test('ตรวจสอบ size', () => {
  assert.equal(orderService.validSize('L'), true);
  assert.equal(orderService.validSize('XXXX'), false);
});
test('คำนวณหลายไซซ์ในคำสั่งซื้อเดียว', () => {
  const items = orderService.buildItems([
    { size: 'S', quantity: 1 },
    { size: 'L', quantity: 2 },
    { size: '2XL', quantity: 1 },
  ]);
  assert.equal(items.length, 3);
  assert.equal(orderService.calculateItemsTotal(items), 2200);
});
test('รวมรายการไซซ์ซ้ำและปฏิเสธจำนวนรวมเกินกำหนด', () => {
  const items = orderService.buildItems([
    { size: 'L', quantity: 2 },
    { size: 'L', quantity: 3 },
  ]);
  assert.deepEqual(
    items.map(({ size, quantity, subtotal }) => ({ size, quantity, subtotal })),
    [{ size: 'L', quantity: 5, subtotal: 2750 }],
  );
  assert.throws(() =>
    orderService.buildItems([
      { size: 'S', quantity: 11 },
      { size: 'M', quantity: 10 },
    ]),
  );
});
test('admin can build an edited order above the public 20-item limit', () => {
  const rawItems = [
    { size: 'L', quantity: 20 },
    { size: 'XL', quantity: 19 },
  ];
  assert.throws(() => orderService.buildItems(rawItems));
  const items = orderService.buildItems(rawItems, { enforceOrderLimit: false });
  assert.equal(
    items.reduce((sum, item) => sum + item.quantity, 0),
    39,
  );
  assert.equal(orderService.calculateItemsTotal(items), 21450);
});
test('สร้างเลขคำสั่งซื้ออ่านง่ายและไม่ซ้ำ', () => {
  const a = generate(new Date('2026-07-24T04:00:00Z')),
    b = generate(new Date('2026-07-24T04:00:00Z'));
  assert.match(a, /^FRT-20260724-[A-F0-9]{6}$/);
  assert.notEqual(a, b);
});
test('bcrypt ตรวจรหัสผ่าน admin', async () => {
  const hash = await bcrypt.hash('correct horse', 4);
  assert.equal(await bcrypt.compare('correct horse', hash), true);
  assert.equal(await bcrypt.compare('wrong', hash), false);
});
test('ตรวจทั้งนามสกุลและ MIME', () => {
  assert.equal(validateFile({ originalname: 'a.webp', mimetype: 'image/webp' }), true);
  assert.equal(validateFile({ originalname: 'a.exe', mimetype: 'image/webp' }), false);
  assert.equal(validateFile({ originalname: 'a.jpg', mimetype: 'text/plain' }), false);
});
test('สร้าง token สำหรับลิงก์ลูกค้าที่เดายากและไม่ซ้ำ', () => {
  const first = orderService.generateShareToken();
  const second = orderService.generateShareToken();
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});
