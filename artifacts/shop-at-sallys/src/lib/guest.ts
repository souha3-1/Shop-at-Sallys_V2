// Phase 7 — guest identity: no customer accounts by decision, so everything
// customer-specific that we keep, we keep ON THE DEVICE. The wishlist and the
// order history live in localStorage; the server only ever sees the contact
// details an order legally needs. There is no sign-in, no session, and no
// profile row to protect — RLS on the shared tables (Phase 3) is the whole
// security model for server-side data.
//
// Reads are defensive: corrupted JSON or a storage-unavailable browser
// (private mode) degrades to an empty list instead of crashing the app.

const WISHLIST_KEY = 'shop-at-sallys.wishlist';
const ORDERS_KEY = 'shop-at-sallys.orders';
/** Keep the newest N orders so the list can never grow without bound. */
const MAX_ORDERS = 20;

/** A checkout this browser performed, recorded at confirmation time. */
export type GuestOrder = {
  reference: string;
  /** Stored order status from the server ('pending' on placement). Optional
   *  so entries saved before Phase 8 still validate. */
  status?: string;
  placedAt: string; // ISO timestamp
  contactName: string;
  itemCount: number;
  subtotalDa: number;
  deliveryFeeDa: number;
  totalDa: number;
};

function read<T>(key: string, validate: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode / quota): state-only for this session.
  }
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isGuestOrderArray = (value: unknown): value is GuestOrder[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as GuestOrder).reference === 'string' &&
      ((entry as GuestOrder).status === undefined ||
        typeof (entry as GuestOrder).status === 'string') &&
      typeof (entry as GuestOrder).placedAt === 'string' &&
      typeof (entry as GuestOrder).contactName === 'string' &&
      typeof (entry as GuestOrder).itemCount === 'number' &&
      typeof (entry as GuestOrder).subtotalDa === 'number' &&
      typeof (entry as GuestOrder).deliveryFeeDa === 'number' &&
      typeof (entry as GuestOrder).totalDa === 'number',
  );

export function readStoredWishlist(): string[] {
  return read(WISHLIST_KEY, isStringArray, []);
}

export function storeWishlist(productIds: string[]): void {
  write(WISHLIST_KEY, productIds);
}

export function readStoredOrders(): GuestOrder[] {
  return read(ORDERS_KEY, isGuestOrderArray, []);
}

/** Record a placed order (newest first, capped). */
export function rememberOrder(order: GuestOrder): void {
  write(ORDERS_KEY, [order, ...readStoredOrders()].slice(0, MAX_ORDERS));
}
