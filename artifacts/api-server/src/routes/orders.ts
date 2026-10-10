import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { PlaceOrderBody } from "@workspace/api-zod";
import {
  cartItemsTable,
  cartsTable,
  db,
  orderItemsTable,
  ordersTable,
  productsTable,
} from "@workspace/db";

// Phase 5 — checkout: cart → order, server-authoritative.
//
// Totals are recomputed here from live catalog prices (client numbers are
// never trusted), lines are snapshotted into order_items (Phase 2), the
// 'SS-XXXX' reference comes from public.order_reference_seq (race-free,
// unique by construction), and the cart is emptied — all in one transaction.
//
// Payment on delivery: no payment data exists in this flow, so the delivery
// fee is never part of the charged total (free over 5,000 DA per shop
// policy is settled with the customer by phone).

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
          product_ids: unavailable,
        },
      } as const;
    }
    if (lines.length === 0) {
      return { conflict: { message: "Your bag is empty" } } as const;
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

    const itemCount = buyable.reduce(
      (count, line) => count + line.quantity,
      0,
    );
    const subtotal = buyable.reduce(
      (sum, line) => sum + line.unitPriceDa * line.quantity,
      0,
    );
    const deliveryFee = 0;
    const total = subtotal + deliveryFee;

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
      .returning({ id: ordersTable.id });

    await tx.insert(orderItemsTable).values(
      buyable.map((line) => ({
        orderId: order.id,
        productId: line.productId,
        productName: line.productName,
        unitPriceDa: line.unitPriceDa,
        quantity: line.quantity,
      })),
    );

    await tx
      .delete(cartItemsTable)
      .where(eq(cartItemsTable.cartId, body.cart_id));

    return {
      order: {
        reference,
        item_count: itemCount,
        subtotal_da: subtotal,
        delivery_fee_da: deliveryFee,
        total_da: total,
      },
    };
  });

  if ("conflict" in result) {
    return res.status(409).json(result.conflict);
  }
  return res.status(201).json(result.order);
});

export default router;
