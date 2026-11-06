import { D, roundPeso } from './money.js';

/**
 * Prices an order. Pure function: pass the fee settings in (they come from env at the call site).
 *   delivery fee = baseFee + perKm x billable km, where billable km = distance rounded up, at least 1
 * Returns Decimals; convert with money() when building a response.
 */
export function priceOrder({ subtotal, distanceKm }, { baseFee, perKm, serviceFee }) {
  const billableKm = Math.max(1, Math.ceil(distanceKm));
  const deliveryFee = roundPeso(D(baseFee).plus(D(perKm).times(billableKm)));
  const service = roundPeso(serviceFee);
  const sub = roundPeso(subtotal);
  return { subtotal: sub, deliveryFee, serviceFee: service, total: sub.plus(deliveryFee).plus(service) };
}
