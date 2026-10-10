import { bigint, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// cart_items — one line per product in a cart. No price column: a cart is
// not a purchase, so the api-server joins products for live pricing on every
// read and at checkout (order_items snapshots the price instead). quantity is
// 1..99 (CHECK in SQL); unique (cart_id, product_id) mirrors the storefront's
// merge-on-add behaviour. The SQL migrations are the source of truth.
export const cartItemsTable = pgTable(
  "cart_items",
  {
    // identity column (Phase 5 migration); never set on insert.
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    cartId: uuid("cart_id").notNull(),
    productId: text("product_id").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("cart_items_cart_id_product_id_key").on(table.cartId, table.productId)],
);

export type CartItem = typeof cartItemsTable.$inferSelect;
export type NewCartItem = typeof cartItemsTable.$inferInsert;
