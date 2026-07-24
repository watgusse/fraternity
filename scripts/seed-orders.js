require('dotenv').config();
const storage = require('../services/storage')();
const { randomUUID } = require('crypto');
const generate = require('../utils/generateOrderNumber');
const product = require('../config/product.json');
(async () => {
  const now = new Date().toISOString();
  await storage.update((data) =>
    data.orders.push({
      id: randomUUID(),
      orderNumber: generate(),
      customer: {
        fullName: 'ผู้ซื้อทดสอบ',
        phone: '0812345678',
        email: '',
        addressLine: '99 ถนนตัวอย่าง',
        subdistrict: 'แขวงตัวอย่าง',
        district: 'เขตตัวอย่าง',
        province: 'กรุงเทพมหานคร',
        postalCode: '10100',
      },
      items: [{ productName: product.name, size: 'L', quantity: 1, unitPrice: 550, subtotal: 550 }],
      totalAmount: 550,
      note: 'ข้อมูลจำลอง ลบก่อนใช้งานจริง',
      paymentSlip: {
        storageType: 'local',
        pathname: 'seed-placeholder.webp',
        url: '',
        contentType: 'image/webp',
        originalName: 'placeholder.webp',
      },
      paymentStatus: 'pending_verification',
      shippingStatus: 'waiting',
      orderStatus: 'pending_payment_verification',
      statusHistory: [
        { status: 'pending_payment_verification', changedAt: now, changedBy: 'seed' },
      ],
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    }),
  );
  console.log('เพิ่มคำสั่งซื้อจำลองแล้ว');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
