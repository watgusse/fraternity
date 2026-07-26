const test = require('node:test');
const assert = require('node:assert/strict');
const { _filterOrders: filterOrders } = require('../controllers/adminController');

function order(overrides = {}) {
  return {
    orderNumber: 'ORD-001',
    customer: { fullName: 'Example Customer', phone: '0812345678' },
    adminNote: '',
    orderStatus: 'paid',
    items: [{ size: 'L' }],
    createdAt: '2026-07-26T10:00:00.000Z',
    ...overrides,
  };
}

test('admin search includes internal notes and is case-insensitive', () => {
  const orders = [
    order({ orderNumber: 'ORD-001', adminNote: 'Call customer before SHIPPING' }),
    order({ orderNumber: 'ORD-002', adminNote: 'Payment confirmed' }),
  ];

  const result = filterOrders(orders, { q: 'shipping' });

  assert.deepEqual(
    result.map((item) => item.orderNumber),
    ['ORD-001'],
  );
});

test('admin search supports legacy orders without an internal note', () => {
  const legacyOrder = order({ orderNumber: 'ORD-LEGACY' });
  delete legacyOrder.adminNote;

  assert.doesNotThrow(() => filterOrders([legacyOrder], { q: 'not-found' }));
  assert.deepEqual(filterOrders([legacyOrder], { q: 'not-found' }), []);
});
