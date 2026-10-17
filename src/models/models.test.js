import test from 'node:test';
import assert from 'node:assert/strict';
import { moneyAmount, pagination } from './common.model.js';
import { registerSchema } from './auth.model.js';
import { createProductSchema } from './product.model.js';

test('moneyAmount accepts numbers and strings with up to 2 decimals', () => {
  assert.equal(moneyAmount.parse(150), '150');
  assert.equal(moneyAmount.parse('150.5'), '150.5');
  assert.equal(moneyAmount.parse(99.99), '99.99');
});

test('moneyAmount rejects 3 decimals, negatives and junk', () => {
  for (const bad of ['1.234', '-5', 'abc', '', '1e5']) {
    assert.equal(moneyAmount.safeParse(bad).success, false, `should reject ${bad}`);
  }
});

test('pagination defaults and caps', () => {
  assert.deepEqual(pagination.parse({}), { page: 1, pageSize: 20 });
  assert.equal(pagination.safeParse({ pageSize: '101' }).success, false);
  assert.equal(pagination.safeParse({ page: '0' }).success, false);
});

test('register defaults to CUSTOMER and never allows ADMIN', () => {
  const base = { email: 'A@B.com', password: 'a-long-password', name: 'Ann' };
  const parsed = registerSchema.parse(base);
  assert.equal(parsed.role, 'CUSTOMER');
  assert.equal(parsed.email, 'a@b.com');
  assert.equal(registerSchema.safeParse({ ...base, role: 'ADMIN' }).success, false);
});

test('product price is normalised to a string', () => {
  const parsed = createProductSchema.parse({
    branchId: '3b1b8f2a-1111-4222-8333-444455556666',
    name: 'Adobo',
    price: 150,
  });
  assert.equal(parsed.price, '150');
});
