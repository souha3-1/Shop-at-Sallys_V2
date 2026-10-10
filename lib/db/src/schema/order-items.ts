import { bigint, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// order_items — immutable purchase lines (Phase 2 schema). unit_price_da is
// the price snapshot taken by checkout (api-server, Phase 5); line_total_da is
// a GENERATED stored column in SQL and therefore never set on insert.
// The SQL migrations are the source of truth.
export const orderItemsTable = pgTable(
  "order_items",
  {
    // identity column (Phase 2 migration); never set on insert.
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: bigint("order_id", { mode: "number" }).notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    unitPriceDa: integer("unit_price_da").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalDa: integer("line_total_da").generatedAlwaysAs(
      sql`unit_price_da * quantity`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;
