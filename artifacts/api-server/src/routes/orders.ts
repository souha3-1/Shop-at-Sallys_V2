import { Router, type IRouter } from "express";
import { eq, inArray, sql } from "drizzle-orm";
import { PlaceOrderBody } from "@workspace/api-zod";
import {
  cartItemsTable,
  cartsTable,
  db,
  inventoryTable,
  orderItemsTable,
  ordersTable,
  productsTable,
} from "@workspace/db";
import { deliveryFeeDa, itemCount, subtotalDa, totalDa } from "@workspace/pricing";

// Phase 6 — checkout: cart → order, server-authoritative.
//
// Trust boundary: the client sends only contact details + cart id. Prices and
// stock come from the database inside one transaction:
//   1. lock the cart's tracked inventory rows (FOR UPDATE) in product_id
//      order so concurrent checkouts serialize instead of overselling,
//   2. validate every line (product still active, quantity within stock),
//   3. recompute totals with @workspace/pricing — the same module the cart
//      view uses, so the bag total and the order total can never disagree,
//   4. snapshot lines into order_items, allocate the 'SS-XXXX' reference from
//      public.order_reference_seq, decrement tracked stock, empty the cart.
// A failure at any step aborts the whole transaction (nothing half-writes).
//
// Stock semantics: a product with no inventory row is untracked (always
// sellable); a row is a hard cap and is decremented here so stock can never
// go negative — the inventory CHECK (quantity >= 0) is the last line of
// defence.
//
// Payment on delivery: no payment data is collected, so the delivery fee
// follows shop policy (free at/above 5,000 DA, otherwise the flat fee) and
// total = subtotal + fee, computed once by totalDa().

const router: IRouter = Router();

router.post("/orders", async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".") || "body";
    return res
      .status(400)
      .json({ message: `Invalid ${field}: ${issue.message}` });
  }
  const body = parsed.data;

  const [cart] = await db
    .select({ id: cartsTable.id })
    .from(cartsTable)
    .where(eq(cartsTable.id, body.cart_id))
    .limit(1);
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const result = await db.transaction(async (tx) => {
    // Duplicate-submission guard: lock THIS cart's row first. A second
    // request for the same cart (double click, second tab, retry) blocks
    // here until the first submission commits, then reads the emptied cart
    // below and fails with 409 `empty_cart` instead of creating a second
    // order. Cart mutations take this same lock first, so lock order is
    // always cart → inventory — no deadlocks.
    await tx
      .select({ id: cartsTable.id })
      .from(cartsTable)
      .where(eq(cartsTable.id, body.cart_id))
      .for("update");

    // Left join on purpose: a line whose product was removed (or is not
    // active) shows up with NULL product fields and blocks checkout instead
    // of being silently dropped.
    const lines = await tx
      .select({
        productId: cartItemsTable.productId,
        productName: productsTable.name,
        unitPriceDa: productsTable.priceDa,
        quantity: cartItemsTable.quantity,
        status: productsTable.status,
      })
      .from(cartItemsTable)
      .leftJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
      .where(eq(cartItemsTable.cartId, body.cart_id));

    const unavailable = lines
      .filter((line) => line.status !== "active")
      .map((line) => line.productId);
    if (unavailable.length > 0) {
      return {
        conflict: {
          message:
            "Some items in your bag are no longer available and have been flagged for removal",
          code: "unavailable" as const,
          product_ids: unavailable,
        },
      } as const;
    }
    if (lines.length === 0) {
      return {
        conflict: {
          message: "Your bag is empty",
          code: "empty_cart" as const,
        },
      } as const;
    }

    // The checks above guarantee every line has an active product; narrow the
    // left-join nullables so the inserts below are type-safe.
    type BuyableLine = typeof lines[number] & {
      productName: string;
      unitPriceDa: number;
    };
    const buyable = lines.filter(
      (line): line is BuyableLine =>
        line.status === "active" &&
        line.productName !== null &&
        line.unitPriceDa !== null,
    );

    // Lock tracked inventory rows for this order's products — always in
    // product_id order so two overlapping checkouts acquire the same locks
    // in the same sequence (no deadlock). Rows absent = untracked product.
    const productIds = buyable.map((line) => line.productId).sort();
    const stockRows = await tx
      .select({
        productId: inventoryTable.productId,
        quantity: inventoryTable.quantity,
      })
      .from(inventoryTable)
      .where(inArray(inventoryTable.productId, productIds))
      .orderBy(inventoryTable.productId)
      .for("update");
    const stock = new Map(stockRows.map((row) => [row.productId, row.quantity]));

    const outOfStock = buyable.filter((line) => {
      const available = stock.get(line.productId);
      return available !== undefined && line.quantity > available;
    });
    if (outOfStock.length > 0) {
      return {
        conflict: {
          message:
            "Some items in your bag exceed the quantity left in stock — reduce the quantity and try again",
          code: "out_of_stock" as const,
          product_ids: outOfStock.map((line) => line.productId),
        },
      } as const;
    }

    // One source of truth for money maths (see @workspace/pricing): the
    // client's numbers never enter this computation.
    const priced = buyable.map((line) => ({
      unitPriceDa: line.unitPriceDa,
      quantity: line.quantity,
    }));
    const subtotal = subtotalDa(priced);
    const deliveryFee = deliveryFeeDa(subtotal);
    const total = totalDa(priced);
    const units = itemCount(priced);

    const seq = await tx.execute(
      sql`select nextval('public.order_reference_seq') as nextval`,
    );
    const reference = `SS-${String(
      Number((seq.rows[0] as { nextval: string | number }).nextval),
    ).padStart(4, "0")}`;

    const [order] = await tx
      .insert(ordersTable)
      .values({
        reference,
        contactName: body.contact_name,
        contactPhone: body.contact_phone,
        shippingAddress: body.shipping_address,
        customerNote: body.customer_note ?? null,
        subtotalDa: subtotal,
        deliveryFeeDa: deliveryFee,
        totalDa: total,
      })
      .returning({ id: ordersTable.id, status: ordersTable.status });

    await tx.insert(orderItemsTable).values(
      buyable.map((line) => ({
        orderId: order.id,
        productId: line.productId,
        productName: line.productName,
        unitPriceDa: line.unitPriceDa,
        quantity: line.quantity,
      })),
    );

    // Decrement tracked stock (untracked products have no row to touch).
    // Validation above + the row locks guarantee quantity never goes negative.
    const decrements = buyable
      .filter((line) => stock.has(line.productId))
      .map(
        (line) =>
          sql`update public.inventory set quantity = quantity - ${line.quantity}
              where product_id = ${line.productId}`,
      );
    for (const statement of decrements) await tx.execute(statement);

    await tx
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.cartId, body.cart_id));

    return {
      order: {
        reference,
        // The stored row's status (DB default 'pending') so the confirmation
        // reflects what was actually written, not a client-side guess.
        status: order.status,
        item_count: units,
        subtotal_da: subtotal,
        delivery_fee_da: deliveryFee,
        total_da: total,
      },
    } as const;
  });

  if ("conflict" in result) {
    return res.status(409).json(result.conflict);
  }
  return res.status(201).json(result.order);
});

export default router;
