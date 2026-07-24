const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../services/storage/localStorage');
test('local storage adapter มี contract ครบ', () => {
  for (const name of ['readData', 'update', 'saveSlip', 'getSlip', 'deleteSlip'])
    assert.equal(typeof storage[name], 'function');
});
