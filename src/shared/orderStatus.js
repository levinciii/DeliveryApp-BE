/**
 * Who may move an order from one status to the next. This is the single source of truth: the API
 * enforces it and also returns `allowedNextStatuses` so the UIs never duplicate these rules.
 *
 * Not here yet (dispatch phase): PICKED_UP and DELIVERED, which riders will drive.
 */
const TRANSITIONS = {
  PENDING: {
    CUSTOMER: ['CANCELLED'],
    MERCHANT: ['ACCEPTED', 'REJECTED'],
    ADMIN: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  },
  ACCEPTED: {
    CUSTOMER: ['CANCELLED'],
    MERCHANT: ['PREPARING', 'CANCELLED'],
    ADMIN: ['PREPARING', 'CANCELLED'],
  },
  PREPARING: {
    MERCHANT: ['READY_FOR_PICKUP', 'CANCELLED'],
    ADMIN: ['READY_FOR_PICKUP', 'CANCELLED'],
  },
  READY_FOR_PICKUP: {
    ADMIN: ['CANCELLED'],
  },
};

const ACTOR_BY_ROLE = {
  CUSTOMER: 'CUSTOMER',
  MERCHANT_OWNER: 'MERCHANT',
  MERCHANT_STAFF: 'MERCHANT',
  ADMIN: 'ADMIN',
};

/** Statuses `role` may move an order to from `status` (empty when none). */
export function allowedNextStatuses(status, role) {
  const actor = ACTOR_BY_ROLE[role];
  return (actor && TRANSITIONS[status]?.[actor]) || [];
}

/** Statuses an order can still leave; used to describe lifecycle in docs and tests. */
export const ACTIVE_STATUSES = Object.keys(TRANSITIONS);
