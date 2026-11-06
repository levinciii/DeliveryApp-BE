import prisma from '../config/prisma.js';
import { badRequest, conflict, notFound } from '../shared/errors.js';
import { D, money } from '../shared/money.js';

const MAX_LINES = 30;

const itemsInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      product: {
        include: { branch: { include: { merchant: { select: { businessName: true, status: true } } } } },
      },
    },
  },
};

const isAvailable = (product) =>
  product.status === 'ACTIVE' &&
  product.branch.status === 'APPROVED' &&
  product.branch.merchant.status === 'APPROVED';

/** The cart as the UI needs it: lines with live prices, one branch, and a subtotal. */
function cartDto(cart) {
  const items = cart?.items ?? [];
  const first = items[0]?.product.branch;
  const lines = items.map((i) => ({
    productId: i.productId,
    name: i.product.name,
    unitPrice: money(i.product.price),
    quantity: i.quantity,
    lineTotal: money(D(i.product.price).times(i.quantity)),
    available: isAvailable(i.product),
  }));
  return {
    branch: first ? { id: first.id, name: first.name, merchantName: first.merchant.businessName } : null,
    items: lines,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: money(items.reduce((sum, i) => sum.plus(D(i.product.price).times(i.quantity)), D(0))),
  };
}

async function getCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId }, include: itemsInclude });
  return cartDto(cart);
}

/** Sets a product's quantity in the cart (adds it if missing). A cart holds one branch at a time. */
async function setItem(userId, { productId, quantity, replaceCart }) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { branch: { include: { merchant: { select: { businessName: true, status: true } } } } },
  });
  if (!product || !isAvailable(product)) throw notFound('Product is not available');

  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: { items: { include: { product: { select: { branchId: true } } } } },
  });

  const cartBranchId = cart.items[0]?.product.branchId;
  if (cartBranchId && cartBranchId !== product.branchId) {
    if (!replaceCart) {
      throw conflict('Your cart has items from another branch', { code: 'CART_BRANCH_CONFLICT' });
    }
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  } else if (!cart.items.some((i) => i.productId === productId) && cart.items.length >= MAX_LINES) {
    throw badRequest(`A cart can hold up to ${MAX_LINES} different products`);
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity },
    create: { cartId: cart.id, productId, quantity },
  });
  return getCart(userId);
}

async function removeItem(userId, productId) {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  return getCart(userId);
}

async function clearCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
  if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return getCart(userId);
}

export { getCart, setItem, removeItem, clearCart, itemsInclude, isAvailable };
