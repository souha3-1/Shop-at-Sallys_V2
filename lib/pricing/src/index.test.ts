// Phase 6 — unit tests for the pure pricing/cart logic.
//
// These are the "unit tests cover pure pricing/cart logic" exit criterion.
// Run with:  pnpm --filter @workspace/pricing run test   (node --test, no deps)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FREE_DELIVERY_THRESHOLD_DA,
  FLAT_DELIVERY_FEE_DA,
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  UNTRACKED_STOCK,
  canHoldQuantity,
  deliveryFeeDa,
  itemCount,
  lineTotalDa,
  maxLineQuantity,
  normalizeQuantity,
  stockState,
  subtotalDa,
  totalDa,
} from "./index.ts";

describe("deliveryFeeDa", () => {
  it("is free at or above the threshold", () => {
    assert.equal(deliveryFeeDa(FREE_DELIVERY_THRESHOLD_DA), 0);
    assert.equal(deliveryFeeDa(FREE_DELIVERY_THRESHOLD_DA + 1), 0);
    assert.equal(deliveryFeeDa(25_000), 0);
  });

  it("charges the flat fee below the threshold", () => {
    assert.equal(deliveryFeeDa(0), FLAT_DELIVERY_FEE_DA);
    assert.equal(deliveryFeeDa(FREE_DELIVERY_THRESHOLD_DA - 1), FLAT_DELIVERY_FEE_DA);
    assert.equal(deliveryFeeDa(1_850), FLAT_DELIVERY_FEE_DA);
  });

  it("is exactly free at the boundary (>=, not >)", () => {
    // The storefront copy says "over 5,000 DA" but the rule is inclusive; pin
    // the inclusive behaviour so a future edit can't silently change it.
    assert.equal(deliveryFeeDa(5_000), 0);
  });
});

describe("line/subtotal/itemCount", () => {
  it("computes a line total", () => {
    assert.equal(lineTotalDa({ unitPriceDa: 1_850, quantity: 3 }), 5_550);
    assert.equal(lineTotalDa({ unitPriceDa: 1_350, quantity: 1 }), 1_350);
  });

  it("sums lines and counts units across lines", () => {
    const lines = [
      { unitPriceDa: 1_850, quantity: 3 },
      { unitPriceDa: 1_350, quantity: 1 },
    ];
    assert.equal(subtotalDa(lines), 6_900);
    assert.equal(itemCount(lines), 4);
  });

  it("returns 0 and 0 for an empty cart", () => {
    assert.equal(subtotalDa([]), 0);
    assert.equal(itemCount([]), 0);
  });
});

describe("totalDa (subtotal + delivery)", () => {
  it("adds the flat fee below the threshold", () => {
    // 1 mug at 1,850 -> below threshold -> +400 delivery.
    assert.equal(totalDa([{ unitPriceDa: 1_850, quantity: 1 }]), 1_850 + FLAT_DELIVERY_FEE_DA);
  });

  it("adds no fee at or above the threshold", () => {
    assert.equal(totalDa([{ unitPriceDa: 1_850, quantity: 3 }]), 5_550);
  });

  it("is deterministic for the same input", () => {
    const lines = [
      { unitPriceDa: 1_850, quantity: 3 },
      { unitPriceDa: 1_350, quantity: 1 },
    ];
    assert.equal(totalDa(lines), totalDa(lines));
    assert.equal(totalDa(lines), 6_900); // above threshold -> free delivery
  });
});

describe("normalizeQuantity (reject invalid, keep valid)", () => {
  it("accepts the valid 1..99 window", () => {
    assert.equal(normalizeQuantity(MIN_LINE_QUANTITY), 1);
    assert.equal(normalizeQuantity(MAX_LINE_QUANTITY), 99);
    assert.equal(normalizeQuantity(50), 50);
  });

  it("rejects zero and negatives", () => {
    assert.equal(normalizeQuantity(0), null);
    assert.equal(normalizeQuantity(-1), null);
    assert.equal(normalizeQuantity(-99), null);
  });

  it("rejects fractional, NaN, Infinity and non-numbers", () => {
    assert.equal(normalizeQuantity(1.5), null);
    assert.equal(normalizeQuantity(NaN), null);
    assert.equal(normalizeQuantity(Infinity), null);
    assert.equal(normalizeQuantity("3" as unknown), null);
    assert.equal(normalizeQuantity(null), null);
    assert.equal(normalizeQuantity(undefined), null);
  });

  it("rejects quantities above the max", () => {
    assert.equal(normalizeQuantity(100), null);
    assert.equal(normalizeQuantity(1_000), null);
  });
});

describe("stock (untracked = always sellable, tracked = hard cap)", () => {
  it("treats a missing inventory row as untracked", () => {
    assert.deepEqual(stockState(null), UNTRACKED_STOCK);
    assert.deepEqual(stockState(undefined), UNTRACKED_STOCK);
    assert.equal(maxLineQuantity(stockState(null)), MAX_LINE_QUANTITY);
    assert.equal(canHoldQuantity(MAX_LINE_QUANTITY, stockState(null)), true);
  });

  it("caps a tracked line at the available quantity", () => {
    const stock = stockState({ quantity: 3 });
    assert.equal(maxLineQuantity(stock), 3);
    assert.equal(canHoldQuantity(3, stock), true);
    assert.equal(canHoldQuantity(4, stock), false);
  });

  it("treats 0 available as sold out (nothing fits)", () => {
    const stock = stockState({ quantity: 0 });
    assert.equal(maxLineQuantity(stock), 0);
    assert.equal(canHoldQuantity(1, stock), false);
  });

  it("never lets tracked stock exceed the 99 line cap", () => {
    const stock = stockState({ quantity: 500 });
    assert.equal(maxLineQuantity(stock), MAX_LINE_QUANTITY);
    assert.equal(canHoldQuantity(MAX_LINE_QUANTITY, stock), true);
    assert.equal(canHoldQuantity(MAX_LINE_QUANTITY + 1, stock), false);
  });

  it("rejects invalid desired quantities regardless of stock", () => {
    assert.equal(canHoldQuantity(0, UNTRACKED_STOCK), false);
    assert.equal(canHoldQuantity(-1, UNTRACKED_STOCK), false);
    assert.equal(canHoldQuantity(1.5, stockState({ quantity: 50 })), false);
    assert.equal(canHoldQuantity(NaN, stockState({ quantity: 50 })), false);
  });
});
