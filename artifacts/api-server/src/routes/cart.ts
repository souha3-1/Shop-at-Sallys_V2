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
import { cartsTable, cartItemsTable, db, productsTable } from "@workspace/db";

// Phase 5 — server-side guest cart.
//
// The browser holds the cart uuid (localStorage) and presents it with every
// call: an unguessable bearer capability until Phase 7 auth attaches carts to
// profiles. Prices are NEVER accepted from the client — every read joins the
// live catalog, matching what checkout will charge.
//
// Visibility rule: readable cart lines are those whose product is active.
// A product that leaves the catalog silently drops out of the readable view;
// checkout detects the leftover rows and answers 409 with the product ids so
// the client can clean up (see orders.ts).

const MAX_LINE_QUANTITY = 99; // mirrors the cart_items CHECK (1..99)

function fail(res: Response, status: number, message: string): Response {
  return res.status(status).json({ message });
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

/** Read a cart: active product lines with live prices, computed totals. */
async function loadCart(cartId: string): Promise<Cart> {
  const lines = await db
    .select({
      productId: productsTable.id,
      name: productsTable.name,
      unitPriceDa: productsTable.priceDa,
      quantity: cartItemsTable.quantity,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(
      and(
        eq(cartItemsTable.cartId, cartId),
        eq(productsTable.status, "active"),
      ),
    );

  return {
    id: cartId,
    items: lines.map((line) => ({
      product_id: line.productId,
      name: line.name,
      unit_price_da: line.unitPriceDa,
      quantity: line.quantity,
      line_total_da: line.unitPriceDa * line.quantity,
    })),
    item_count: lines.reduce((count, line) => count + line.quantity, 0),
    subtotal_da: lines.reduce(
      (sum, line) => sum + line.unitPriceDa * line.quantity,
      0,
    ),
  };
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

// GET /cart/:cartId — the cart with live-price lines and subtotal.
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

  try {
    // Atomic merge-on-add: the DB enforces the 1..99 CHECK under concurrency.
    await db
      .insert(cartItemsTable)
      .values({ cartId, productId, quantity })
      .onConflictDoUpdate({
        target: [cartItemsTable.cartId, cartItemsTable.productId],
        set: {
          quantity: sql`${cartItemsTable.quantity} + ${quantity}`,
        },
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
    const updated = await db
      .update(cartItemsTable)
      .set({ quantity })
      .where(
        and(
          eq(cartItemsTable.cartId, cartId),
          eq(cartItemsTable.productId, productId),
        ),
      );
    if (updated.rowCount === 0)
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
