const test = require('node:test');
const assert = require('node:assert/strict');
const { _buildSummary: buildSummary } = require('../controllers/adminController');

test('paid summary includes paid orders after they progress to shipping or completed', () => {
  const orders = [
    {
      orderStatus: 'pending_payment_verification',
      paymentStatus: 'pending_verification',
      totalAmount: 550,
      items: [{ quantity: 1 }],
    },
    {
      orderStatus: 'paid',
      paymentStatus: 'paid',
      totalAmount: 1100,
      items: [{ quantity: 2 }],
    },
    {
      orderStatus: 'completed',
      paymentStatus: 'paid',
      totalAmount: 1650,
      items: [{ quantity: 3 }],
    },
  ];

  const summary = buildSummary(orders);

  assert.equal(summary.paid, 2);
  assert.equal(summary.paidAmount, 2750);
  assert.equal(summary.amount, 3300);
  assert.equal(summary.shirts, 6);
});
