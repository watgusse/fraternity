process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough-for-tests';
process.env.ADMIN_JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-tests-123456789';
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../app');
const { COOKIE } = require('../middleware/auth');
async function csrfFor(agent, url) {
  const r = await agent.get(url);
  const m = r.text.match(/name="_csrf"\s+value="([^"]+)"/);
  return m && m[1];
}
test('ป้องกัน route admin', async () => {
  const r = await request(app).get('/admin');
  assert.equal(r.status, 302);
  assert.equal(r.headers.location, '/admin/login');
});
test('ปฏิเสธสถานะที่ไม่มีในระบบ', async () => {
  const agent = request.agent(app),
    token = jwt.sign({ username: 'tester', role: 'admin' }, process.env.ADMIN_JWT_SECRET, {
      expiresIn: '1h',
    });
  const csrf = await csrfFor(agent, '/admin/login');
  const r = await agent
    .post('/admin/orders/not-found/status')
    .set('Cookie', `${COOKIE}=${token}`)
    .type('form')
    .send({ _csrf: csrf, status: 'hacked' });
  assert.equal(r.status, 400);
});
test('multipart order ผ่าน CSRF แล้วถูก validation ปฏิเสธจำนวน 0', async () => {
  const agent = request.agent(app),
    csrf = await csrfFor(agent, '/order');
  const r = await agent
    .post('/order')
    .field('_csrf', csrf)
    .field('fullName', 'ผู้ทดสอบ')
    .field('phone', '0812345678')
    .field('addressLine', '1 ถนนทดสอบ')
    .field('subdistrict', 'ตัวอย่าง')
    .field('district', 'ตัวอย่าง')
    .field('province', 'กรุงเทพมหานคร')
    .field('postalCode', '10100')
    .field('sizes', 'L')
    .field('quantities', '0')
    .field('confirmCorrect', 'yes')
    .field('consent', 'yes')
    .attach('paymentSlip', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
      filename: 'slip.jpg',
      contentType: 'image/jpeg',
    });
  assert.equal(r.status, 422);
  assert.match(r.text, /กรุณาตรวจสอบข้อมูล/);
});
