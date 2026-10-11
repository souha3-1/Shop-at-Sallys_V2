import { Router, type IRouter, type Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  AddCartItemBody,
  AddCartItemParams,
  GetCartParams,
  RemoveCartItemParams,
  UpdateCartItemBody,
  UpdateCartItemParams,
  type Cart,
} from "@workspace/api-zod";
import {
  cartsTable,
  cartItemsTable,
  db,
  inventoryTable,
  productsTable,
} from "@workspace/db";
import {
  MAX_LINE_QUANTITY,
  itemCount,
  lineTotalDa,
  stockState,
  subtotalDa,
} from "@workspace/pricing";

// Phase 6 — server-side guest cart.
//
// Guest-cart strategy: the browser holds the cart uuid (localStorage) and
// presents it with every call — an unguessable bearer capability, no account
// involved (the shop has no customer sign-in by design, so there is no
// cart-to-profile migration to plan; the uuid IS the cart's identity).
//
// Trust boundary: prices and stock are NEVER accepted from the client. Every
// read joins the live catalog + inventory, and every mutation re-validates
// quantity against tracked stock inside a transaction (inventory row locked
// FOR UPDATE so concurrent adds to one product serialize).
//
// Stock semantics (see @workspace/pricing): a product with no inventory row
// is untracked — always sellable up to the 1..99 line cap. A row is a hard
// cap: quantity 0 is sold out. Responses expose `stock_available` per line
// (null = untracked) so the storefront can warn before checkout 409s.
//
// Visibility rule: readable cart lines are those whose product is active.
// A product that leaves the catalog silently drops out of the readable view;
// checkout detects the leftover rows and answers 409 with code `unavailable`
// and the product ids so the client can clean up (see orders.ts).

function fail(res: Response, status: number, message: string): Response {
  return res.status(status).json({ message });
}

/** 409 conflict body — `code` tells the client how to recover. */
function conflict(
  res: Response,
  code: "unavailable" | "out_of_stock" | "empty_cart",
  message: string,
  productIds?: string[],
): Response {
  return res
    .status(409)
    .json({ message, code, ...(productIds ? { product_ids: productIds } : {}) });
}

/** True when the cart row exists (regardless of its lines). */
async function cartExists(cartId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: cartsTable.id })
    .from(cartsTable)
    .where(eq(cartsTable.id, cartId))
    .limit(1);
  return Boolean(row);
}

/**
 * Read a cart: active product lines with live prices, per-line stock, and
 * totals computed by @workspace/pricing — the same module checkout uses, so
 * the bag and the order can never disagree.
 */
async function loadCart(cartId: string): Promise<Cart> {
  const lines = await db
    .select({
      productId: productsTable.id,
      name: productsTable.name,
      unitPriceDa: productsTable.priceDa,
      quantity: cartItemsTable.quantity,
      stockAvailable: inventoryTable.quantity,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .leftJoin(inventoryTable, eq(cartItemsTable.productId, inventoryTable.productId))
    .where(
      and(
        eq(cartItemsTable.cartId, cartId),
        eq(productsTable.status, "active"),
      ),
    );

  const priced = lines.map((line) => ({
    unitPriceDa: line.unitPriceDa,
    quantity: line.quantity,
  }));

  return {
    id: cartId,
    items: lines.map((line, index) => ({
      product_id: line.productId,
      name: line.name,
      unit_price_da: line.unitPriceDa,
      quantity: line.quantity,
      line_total_da: lineTotalDa(priced[index]),
      // null (no inventory row) = untracked stock.
      stock_available: line.stockAvailable,
    })),
    item_count: itemCount(priced),
    subtotal_da: subtotalDa(priced),
  };
}

/**
 * Lock a product's inventory row (when tracked) and report its stock.
 * The FOR UPDATE lock is held until the surrounding transaction ends, so
 * concurrent mutations for the same product queue up instead of racing.
 */
async function lockStock(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  productId: string,
) {
  const [row] = await tx
    .select({ quantity: inventoryTable.quantity })
    .from(inventoryTable)
    .where(eq(inventoryTable.productId, productId))
    .for("update");
  return stockState(row ?? null);
}

const router: IRouter = Router();

// POST /cart — create an empty guest cart; client stores the returned id.
router.post("/cart", async (_req, res) => {
  const [row] = await db
    .insert(cartsTable)
    .values({})
    .returning({ id: cartsTable.id });
  return res.status(201).json(await loadCart(row.id));
});

// GET /cart/:cartId — the cart with live-price lines, stock and subtotal.
router.get("/cart/:cartId", async (req, res) => {
  const params = GetCartParams.safeParse(req.params);
  if (!params.success) return fail(res, 400, "Invalid cart id");
  if (!(await cartExists(params.data.cartId)))
    return fail(res, 404, "Cart not found");
  return res.json(await loadCart(params.data.cartId));
});

// POST /cart/:cartId/items — merge-on-add (increment the line, or create it).
router.post("/cart/:cartId/items", async (req, res) => {
  const params = AddCartItemParams.safeParse(req.params);
  if (!params.success) return fail(res, 400, "Invalid cart id");
  const body = AddCartItemBody.safeParse(req.body);
  if (!body.success)
    return fail(res, 400, "Invalid request body: quantity must be 1-99");

  const { cartId } = params.data;
  const { product_id: productId, quantity } = body.data;

  if (!(await cartExists(cartId))) return fail(res, 404, "Cart not found");

  const [product] = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.id, productId),
        eq(productsTable.status, "active"),
      ),
    )
    .limit(1);
  if (!product) return fail(res, 404, "Product not found");

  // Tracked products serialize on the inventory row lock inside the
  // transaction; untracked ones rely on the 1..99 SQL CHECK, so a concurrent
  // merge can still trip it (23514) — map that back to the same 400.
  let outcome: { error: "cap" | "stock" | null; available?: number };
  try {
    outcome = await db.transaction(async (tx) => {
      const stock = await lockStock(tx, productId);

      const [existing] = await tx
        .select({ quantity: cartItemsTable.quantity })
        .from(cartItemsTable)
        .where(
          and(
            eq(cartItemsTable.cartId, cartId),
            eq(cartItemsTable.productId, productId),
          ),
        )
        .limit(1);

      // Merge-on-add: the DESIRED line quantity is what gets validated, so
      // adding 2 to a line that already holds 40 (or to a product with 5 in
      // stock) is rejected before the write, not after.
      const desired = (existing?.quantity ?? 0) + quantity;
      if (desired > MAX_LINE_QUANTITY) return { error: "cap" as const };
      if (stock.tracked && desired > stock.available)
        return {
          error: "stock" as const,
          available: stock.available,
        };

      await tx
        .insert(cartItemsTable)
        .values({ cartId, productId, quantity })
        .onConflictDoUpdate({
          target: [cartItemsTable.cartId, cartItemsTable.productId],
          set: {
            quantity: sql`${cartItemsTable.quantity} + ${quantity}`,
          },
        });
      return { error: null } as const;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "23514"
    ) {
      return fail(
        res,
        400,
        `A line cannot hold more than ${MAX_LINE_QUANTITY} units`,
      );
    }
    throw error;
  }

  if (outcome.error === "cap")
    return fail(
      res,
      400,
      `A line cannot hold more than ${MAX_LINE_QUANTITY} units`,
    );
  if (outcome.error === "stock")
    return conflict(
      res,
      "out_of_stock",
      outcome.available === 0
        ? "This piece is out of stock"
        : `Only ${outcome.available} left in stock`,
      [productId],
    );

  return res.json(await loadCart(cartId));
});

// PATCH /cart/:cartId/items/:productId — set quantity (0 removes the line).
router.patch("/cart/:cartId/items/:productId", async (req, res) => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) return fail(res, 400, "Invalid cart or product id");
  const body = UpdateCartItemBody.safeParse(req.body);
  if (!body.success)
    return fail(res, 400, "Invalid request body: quantity must be 0-99");

  const { cartId, productId } = params.data;
  const { quantity } = body.data;

  if (!(await cartExists(cartId))) return fail(res, 404, "Cart not found");

  if (quantity === 0) {
    const removed = await db
      .delete(cartItemsTable)
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          eq(cartItemsTable.productId, productId),
        ),
      );
    if (removed.rowCount === 0)
      return fail(res, 404, "Product is not in this cart");
  } else {
    const outcome = await db.transaction(async (tx) => {
      const stock = await lockStock(tx, productId);
      if (stock.tracked && quantity > stock.available)
        return { error: "stock" as const, available: stock.available };

      const updated = await tx
        .update(cartItemsTable)
        .set({ quantity })
        .where(
          and(
            eq(cartItemsTable.cartId, cartId),
            eq(cartItemsTable.productId, productId),
          ),
        );
      if (updated.rowCount === 0) return { error: "missing" as const };
      return { error: null } as const;
    });

    if (outcome.error === "stock")
      return conflict(
        res,
        "out_of_stock",
        outcome.available === 0
          ? "This piece is out of stock"
          : `Only ${outcome.available} left in stock`,
        [productId],
      );
    if (outcome.error === "missing")
      return fail(res, 404, "Product is not in this cart");
  }

  return res.json(await loadCart(cartId));
});

// DELETE /cart/:cartId/items/:productId — remove one line.
router.delete("/cart/:cartId/items/:productId", async (req, res) => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) return fail(res, 400, "Invalid cart or product id");

  const { cartId, productId } = params.data;
  if (!(await cartExists(cartId))) return fail(res, 404, "Cart not found");

  const removed = await db
    .delete(cartItemsTable)
    .where(
      and(
        eq(cartItemsTable.cartId, cartId),
        eq(cartItemsTable.productId, productId),
      ),
    );
  if (removed.rowCount === 0)
    return fail(res, 404, "Product is not in this cart");

  return res.json(await loadCart(cartId));
});

export default router;
