process.env.NODE_ENV = 'test';
process.env.COOKIE_SECRET = 'test-cookie-secret-that-is-long-enough-for-tests';
process.env.ADMIN_JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-tests-123456789';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { COOKIE } = require('../middleware/auth');

function csrfFrom(response) {
  return response.text.match(/name="_csrf"\s+value="([^"]+)"/)?.[1];
}

test('admin login succeeds with environment credentials and sets a session cookie', async () => {
  process.env.ADMIN_USERS_JSON = JSON.stringify([
    {
      username: 'admin1',
      passwordHash: bcrypt.hashSync('correct-password', 4),
      role: 'admin',
    },
  ]);
  const agent = request.agent(app);
  const csrf = csrfFrom(await agent.get('/admin/login'));
  const response = await agent
    .post('/admin/login')
    .type('form')
    .send({ _csrf: csrf, username: 'admin1', password: 'correct-password' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/admin');
  assert.match(response.headers['set-cookie'].join(';'), new RegExp(`${COOKIE}=`));
});

test('admin login reports incomplete configuration without exposing secrets', async () => {
  delete process.env.ADMIN_USERS_JSON;
  const agent = request.agent(app);
  const csrf = csrfFrom(await agent.get('/admin/login'));
  const response = await agent
    .post('/admin/login')
    .type('form')
    .send({ _csrf: csrf, username: 'admin1', password: 'any-password' });
  assert.equal(response.status, 503);
  assert.match(response.text, /Environment Variables/);
  assert.doesNotMatch(response.text, /any-password/);
});
