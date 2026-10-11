// Pure cart/order pricing — the single source of truth for money maths.
//
// Phase 6 ("Real cart"). Everything here is a total function over plain
// numbers: no database, no request context, no I/O. The api-server calls
// these to price a cart and to price checkout, so the number a guest sees in
// the bag is computed by the exact same code that charges them at checkout.
//
// Trust boundary: callers pass the live catalog price and the requested
// quantity. A client never supplies a price or a total — if it did, we would
// ignore it. Money is whole Algerian dinars (integer), never floating point.

// --- Shop policy (mirrored in the storefront copy) -------------------------
// Free delivery within Algiers on orders at or above this threshold; below it
// the fee is quoted by phone before dispatch (payment-on-delivery model), so
// the charged total is subtotal + delivery fee and nothing else.
export const FREE_DELIVERY_THRESHOLD_DA = 5_000;
export const FLAT_DELIVERY_FEE_DA = 400;

// cart_items CHECK (quantity between 1 and 99). Mirrored here so pure callers
// can reject bad input before it ever reaches SQL.
export const MIN_LINE_QUANTITY = 1;
export const MAX_LINE_QUANTITY = 99;

/** One cart line as the pricing layer sees it: a live price + a quantity. */
export interface PricedLine {
  unitPriceDa: number;
  quantity: number;
}

/**
 * Delivery fee for a given subtotal, in whole dinars.
 *
 * Free (0) at or above the threshold; a flat fee below it. This is the ONLY
 * place the delivery rule is defined — the checkout route and the storefront
 * summary both derive from here so they can never disagree.
 */
export function deliveryFeeDa(subtotalDa: number): number {
  return subtotalDa >= FREE_DELIVERY_THRESHOLD_DA ? 0 : FLAT_DELIVERY_FEE_DA;
}

/** Total for a single line, in whole dinars. */
export function lineTotalDa(line: PricedLine): number {
  return line.unitPriceDa * line.quantity;
}

/** Sum of every line total — the order subtotal, before delivery. */
export function subtotalDa(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalDa(line), 0);
}

/** Total units across all lines (how many physical objects are in the bag). */
export function itemCount(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** What the customer pays: subtotal + delivery fee. */
export function totalDa(lines: readonly PricedLine[]): number {
  const subtotal = subtotalDa(lines);
  return subtotal + deliveryFeeDa(subtotal);
}

/**
 * Clamp a requested quantity into the allowed 1..99 window, or null when the
 * request is not a usable integer (negative, zero, fractional, NaN). Callers
 * use this to turn untrusted input into a safe quantity or a clean rejection.
 */
export function normalizeQuantity(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw)) return null;
  if (raw < MIN_LINE_QUANTITY || raw > MAX_LINE_QUANTITY) return null;
  return raw;
}

// --- Stock -----------------------------------------------------------------
//
// The inventory table is 1:1 per product. A MISSING row means "untracked":
// the shop has no stock source for that product yet (the Phase 4 seed leaves
// inventory empty on purpose), so it is always sellable up to the 1..99
// per-line cap. A row means a hard cap: its quantity is the number of units
// left, and 0 means sold out.

export type StockState = { tracked: false } | { tracked: true; available: number };

export const UNTRACKED_STOCK: StockState = { tracked: false };

/** Build a StockState from an inventory row (null = no row = untracked). */
export function stockState(row: { quantity: number } | null | undefined): StockState {
  if (!row) return UNTRACKED_STOCK;
  return { tracked: true, available: row.quantity };
}

/**
 * Largest quantity a single cart line may hold: the 1..99 CHECK narrowed by
 * tracked stock when a product has an inventory row.
 */
export function maxLineQuantity(stock: StockState): number {
  return stock.tracked
    ? Math.min(MAX_LINE_QUANTITY, stock.available)
    : MAX_LINE_QUANTITY;
}

/**
 * Can a cart line hold `desired` units? True only for integers in the 1..99
 * window that also fit inside tracked stock. Returns false for 0 — callers
 * that allow 0 handle line removal themselves before consulting this.
 */
export function canHoldQuantity(desired: number, stock: StockState): boolean {
  if (!Number.isInteger(desired)) return false;
  if (desired < MIN_LINE_QUANTITY || desired > MAX_LINE_QUANTITY) return false;
  return desired <= maxLineQuantity(stock);
}
