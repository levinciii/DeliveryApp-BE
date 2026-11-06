import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm } from './geo.js';
import { money } from './money.js';
import { ACTIVE_STATUSES, allowedNextStatuses } from './orderStatus.js';
import { priceOrder } from './pricing.js';
import { setCartItemSchema } from '../models/cart.model.js';
import { placeOrderSchema, updateOrderStatusSchema } from '../models/order.model.js';

const fees = { baseFee: 40, perKm: 10, serviceFee: 10 };

test('haversineKm: same point is 0, ~111 km per degree of latitude', () => {
  const a = { latitude: 14.8, longitude: 120.2 };
  assert.equal(haversineKm(a, a), 0);
  const d = haversineKm(a, { latitude: 15.8, longitude: 120.2 });
  assert.ok(d > 110 && d < 112, `got ${d}`);
});

test('priceOrder: base + per-km, distance rounded up', () => {
  const q = priceOrder({ subtotal: '500', distanceKm: 3.2 }, fees); // 4 billable km -> 40 + 40
  assert.equal(money(q.deliveryFee), '80.00');
  assert.equal(money(q.serviceFee), '10.00');
  assert.equal(money(q.total), '590.00');
});

test('priceOrder: anything under 1 km bills as 1 km', () => {
  const q = priceOrder({ subtotal: '100', distanceKm: 0.1 }, fees);
  assert.equal(money(q.deliveryFee), '50.00');
});

test('priceOrder: no floating point drift on awkward amounts', () => {
  const q = priceOrder({ subtotal: '0.1', distanceKm: 1 }, { baseFee: 0.2, perKm: 0, serviceFee: 0 });
  assert.equal(money(q.total), '0.30');
});

test('status rules: customer can only cancel before preparation starts', () => {
  assert.deepEqual(allowedNextStatuses('PENDING', 'CUSTOMER'), ['CANCELLED']);
  assert.deepEqual(allowedNextStatuses('ACCEPTED', 'CUSTOMER'), ['CANCELLED']);
  assert.deepEqual(allowedNextStatuses('PREPARING', 'CUSTOMER'), []);
});

test('status rules: merchant moves the order forward, both merchant roles alike', () => {
  assert.deepEqual(allowedNextStatuses('PENDING', 'MERCHANT_OWNER'), ['ACCEPTED', 'REJECTED']);
  assert.deepEqual(allowedNextStatuses('PENDING', 'MERCHANT_STAFF'), ['ACCEPTED', 'REJECTED']);
  assert.deepEqual(allowedNextStatuses('PREPARING', 'MERCHANT_OWNER'), ['READY_FOR_PICKUP', 'CANCELLED']);
  assert.deepEqual(allowedNextStatuses('READY_FOR_PICKUP', 'MERCHANT_OWNER'), []);
});

test('status rules: admin can intervene, riders and unknown roles cannot', () => {
  assert.deepEqual(allowedNextStatuses('READY_FOR_PICKUP', 'ADMIN'), ['CANCELLED']);
  assert.deepEqual(allowedNextStatuses('PENDING', 'RIDER'), []);
});

test('status rules: finished orders are terminal for everyone', () => {
  for (const status of ['DELIVERED', 'CANCELLED', 'REJECTED', 'PICKED_UP']) {
    for (const role of ['CUSTOMER', 'MERCHANT_OWNER', 'ADMIN']) {
      assert.deepEqual(allowedNextStatuses(status, role), [], `${status}/${role}`);
    }
  }
  assert.ok(!ACTIVE_STATUSES.includes('DELIVERED'));
});

test('cart item: quantity 1-20, integer, replaceCart defaults to false', () => {
  const id = '3b1b8f2a-1111-4222-8333-444455556666';
  assert.equal(setCartItemSchema.parse({ productId: id, quantity: 2 }).replaceCart, false);
  for (const quantity of [0, 21, 1.5, '2']) {
    assert.equal(setCartItemSchema.safeParse({ productId: id, quantity }).success, false, String(quantity));
  }
});

test('place order: COD default, online methods rejected, notes capped', () => {
  const addressId = '3b1b8f2a-1111-4222-8333-444455556666';
  assert.equal(placeOrderSchema.parse({ addressId }).paymentMethod, 'COD');
  assert.equal(placeOrderSchema.safeParse({ addressId, paymentMethod: 'GCASH' }).success, false);
  assert.equal(placeOrderSchema.safeParse({ addressId, notes: 'x'.repeat(201) }).success, false);
});

test('status update: riders-only statuses cannot be set by hand', () => {
  assert.equal(updateOrderStatusSchema.safeParse({ status: 'DELIVERED' }).success, false);
  assert.equal(updateOrderStatusSchema.safeParse({ status: 'ACCEPTED' }).success, true);
});
