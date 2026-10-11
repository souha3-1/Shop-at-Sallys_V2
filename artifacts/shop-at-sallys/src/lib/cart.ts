// Phase 6 — server-side guest cart (storage strategy).
//
// The cart lives in the api-server (artifacts/api-server/src/routes/cart.ts).
// The browser keeps the cart uuid here (localStorage) and presents it with
// every cart call: an unguessable bearer capability. The shop has NO customer
// accounts by decision, so there is no sign-in and no cart-to-profile
// migration to build — the uuid is the cart's full identity, and the cart
// survives refreshes/tabs for as long as the browser keeps the key (falling
// back to per-tab state when storage is unavailable). All reads/writes go
// through the generated API client (@workspace/api-client-react), same-origin
// under '/api/...' — the Vite dev proxy forwards to the api-server in
// development.

import { createCart } from '@workspace/api-client-react';

const CART_ID_KEY = 'shop-at-sallys.cart-id';

export function readStoredCartId(): string | null {
  try {
    return window.localStorage.getItem(CART_ID_KEY);
  } catch {
    return null; // storage unavailable (private mode): cart is per-tab in memory
  }
}

export function storeCartId(id: string): void {
  try {
    window.localStorage.setItem(CART_ID_KEY, id);
  } catch {
    // storage unavailable: the id still works for this session via state
  }
}

/** Create a cart on the server and remember its id. */
export async function createServerCart(): Promise<string> {
  const cart = await createCart();
  storeCartId(cart.id);
  return cart.id;
}
