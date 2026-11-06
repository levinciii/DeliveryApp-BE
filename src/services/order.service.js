import { randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma/index.js';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { badRequest, conflict, forbidden, notFound } from '../shared/errors.js';
import { haversineKm } from '../shared/geo.js';
import { D, money } from '../shared/money.js';
import { allowedNextStatuses } from '../shared/orderStatus.js';
import { pageArgs, pageResult } from '../shared/pagination.js';
import { priceOrder } from '../shared/pricing.js';
import * as audit from './audit.service.js';
import { isAvailable, itemsInclude } from './cart.service.js';

const pricing = { baseFee: env.DELIVERY_BASE_FEE, perKm: env.DELIVERY_FEE_PER_KM, serviceFee: env.SERVICE_FEE };

// No 0/O/1/I so order numbers are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newOrderNumber() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `DLV-${day}-${suffix}`;
}

/** Which orders a user may see: customers their own, merchants their branches', admins everything. */
function scopeFor(user) {
  switch (user.role) {
    case 'CUSTOMER':
      return { customerId: user.id };
    case 'MERCHANT_OWNER':
    case 'MERCHANT_STAFF':
      return { branch: { merchant: { members: { some: { userId: user.id } } } } };
    case 'ADMIN':
      return {};
    default:
      throw forbidden();
  }
}

const detailInclude = {
  items: { orderBy: { productName: 'asc' } },
  statusHistory: { orderBy: { changedAt: 'asc' } },
  payment: true,
  branch: { select: { id: true, name: true, merchant: { select: { businessName: true } } } },
  customer: { select: { name: true, phone: true } },
};

const listInclude = {
  items: { select: { quantity: true } },
  branch: { select: { id: true, name: true } },
  customer: { select: { name: true } },
};

const orderDetailDto = (o, role) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  notes: o.notes,
  createdAt: o.createdAt,
  branch: { id: o.branch.id, name: o.branch.name, merchantName: o.branch.merchant.businessName },
  customer: { name: o.customer.name, phone: o.customer.phone },
  deliveryAddress: { address: o.deliveryAddress, latitude: o.deliveryLatitude, longitude: o.deliveryLongitude },
  items: o.items.map((i) => ({
    productId: i.productId,
    name: i.productName,
    unitPrice: money(i.unitPrice),
    quantity: i.quantity,
    lineTotal: money(D(i.unitPrice).times(i.quantity)),
  })),
  subtotal: money(o.subtotal),
  deliveryFee: money(o.deliveryFee),
  serviceFee: money(o.serviceFee),
  total: money(o.total),
  payment: o.payment && { method: o.payment.method, status: o.payment.status, amount: money(o.payment.amount) },
  history: o.statusHistory.map((h) => ({ status: h.status, changedAt: h.changedAt })),
  allowedNextStatuses: allowedNextStatuses(o.status, role),
});

const orderListDto = (o, role) => ({
  id: o.id,
  orderNumber: o.orderNumber,
  status: o.status,
  total: money(o.total),
  itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
  branch: o.branch,
  customerName: o.customer.name,
  createdAt: o.createdAt,
  allowedNextStatuses: allowedNextStatuses(o.status, role),
});

/**
 * Reads the cart and address and prices the order. `db` is prisma or a transaction client, so the
 * quote and the real checkout share exactly the same rules.
 */
async function loadCheckout(db, userId, addressId) {
  const cart = await db.cart.findUnique({ where: { userId }, include: itemsInclude });
  if (!cart || cart.items.length === 0) throw badRequest('Your cart is empty');

  const unavailable = cart.items.filter((i) => !isAvailable(i.product));
  if (unavailable.length) {
    throw conflict('Some items are no longer available', {
      code: 'CART_ITEMS_UNAVAILABLE',
      unavailable: unavailable.map((i) => i.product.name),
    });
  }
  if (new Set(cart.items.map((i) => i.product.branchId)).size > 1) {
    throw conflict('Your cart has items from more than one branch', { code: 'CART_BRANCH_CONFLICT' });
  }

  const address = await db.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw notFound('Address not found');

  const branch = cart.items[0].product.branch;
  const distanceKm = haversineKm(branch, address);
  if (distanceKm > env.MAX_DELIVERY_KM) {
    throw badRequest(`This branch delivers within ${env.MAX_DELIVERY_KM} km`, { code: 'OUT_OF_RANGE' });
  }

  const subtotal = cart.items.reduce((sum, i) => sum.plus(D(i.product.price).times(i.quantity)), D(0));
  return { cart, branch, address, distanceKm, ...priceOrder({ subtotal, distanceKm }, pricing) };
}

/** What checkout would charge, without creating anything. */
async function quoteOrder(userId, { addressId }) {
  const c = await loadCheckout(prisma, userId, addressId);
  return {
    branchId: c.branch.id,
    distanceKm: c.distanceKm.toFixed(1),
    subtotal: money(c.subtotal),
    deliveryFee: money(c.deliveryFee),
    serviceFee: money(c.serviceFee),
    total: money(c.total),
  };
}

async function placeOrder(userId, { addressId, paymentMethod, notes }) {
  let order;
  // An order-number collision is astronomically unlikely, but retrying is cheap.
  for (let attempt = 1; ; attempt++) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const c = await loadCheckout(tx, userId, addressId);

        // Claim the cart lines first. If the same request runs twice at once, the second one finds
        // them already gone and rolls back, so a double-click can never create two orders.
        const { count } = await tx.cartItem.deleteMany({ where: { id: { in: c.cart.items.map((i) => i.id) } } });
        if (count !== c.cart.items.length) throw conflict('Your cart changed. Please review it and try again.');

        return tx.order.create({
          data: {
            orderNumber: newOrderNumber(),
            customerId: userId,
            branchId: c.branch.id,
            addressId: c.address.id,
            deliveryAddress: c.address.address,
            deliveryLatitude: c.address.latitude,
            deliveryLongitude: c.address.longitude,
            notes,
            subtotal: money(c.subtotal),
            deliveryFee: money(c.deliveryFee),
            serviceFee: money(c.serviceFee),
            total: money(c.total),
            // Name and price are copied from the product NOW, so later edits never change history.
            items: {
              create: c.cart.items.map((i) => ({
                productId: i.productId,
                productName: i.product.name,
                unitPrice: i.product.price,
                quantity: i.quantity,
              })),
            },
            statusHistory: { create: { status: 'PENDING' } },
            payment: { create: { method: paymentMethod, amount: money(c.total) } },
          },
          include: detailInclude,
        });
      });
      break;
    } catch (e) {
      const retry = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 3;
      if (!retry) throw e;
    }
  }
  await audit.log(userId, 'order.place', 'order', order.id, { orderNumber: order.orderNumber, total: money(order.total) });
  return orderDetailDto(order, 'CUSTOMER');
}

async function listOrders(user, { page, pageSize, status }) {
  const where = { ...scopeFor(user), ...(status ? { status } : {}) };
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({ where, include: listInclude, orderBy: { createdAt: 'desc' }, ...pageArgs({ page, pageSize }) }),
    prisma.order.count({ where }),
  ]);
  return pageResult(rows.map((o) => orderListDto(o, user.role)), { page, pageSize }, total);
}

async function getOrder(user, orderId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, ...scopeFor(user) }, include: detailInclude });
  if (!order) throw notFound('Order not found');
  return orderDetailDto(order, user.role);
}

async function updateStatus(user, orderId, nextStatus) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...scopeFor(user) },
    select: { id: true, status: true },
  });
  if (!order) throw notFound('Order not found');

  const allowed = allowedNextStatuses(order.status, user.role);
  if (!allowed.includes(nextStatus)) {
    throw conflict(`An order that is ${order.status} can't be changed to ${nextStatus}`, { allowedNextStatuses: allowed });
  }

  await prisma.$transaction(async (tx) => {
    // Conditional update: if someone else moved the order meanwhile, nothing matches and we stop.
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: nextStatus } });
    if (count !== 1) throw conflict('This order was just updated. Refresh and try again.');
    await tx.orderStatusHistory.create({ data: { orderId, status: nextStatus } });
  });
  await audit.log(user.id, 'order.status', 'order', orderId, { from: order.status, to: nextStatus });
  return getOrder(user, orderId);
}

export { quoteOrder, placeOrder, listOrders, getOrder, updateStatus };
