process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough-for-tests';
process.env.APP_URL = 'https://shirts.example.com';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

test('Facebook share page exposes absolute Open Graph metadata and order CTA', async () => {
  const response = await request(app).get('/share/fraternity-shirt');
  assert.equal(response.status, 200);
  assert.match(
    response.text,
    /property="og:image" content="https:\/\/shirts\.example\.com\/images\/social\/facebook-shirt-share\.jpg"/,
  );
  assert.match(response.text, /property="og:image:width" content="1200"/);
  assert.match(response.text, /property="og:image:height" content="630"/);
  assert.match(response.text, /href="\/order\?source=facebook"/);
});
