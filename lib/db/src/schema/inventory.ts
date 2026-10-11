import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// inventory — one row per product that the shop actually tracks stock for.
// The Phase 2 SQL migration is the source of truth (quantity >= 0 CHECK,
// product_id FK with on-delete cascade, updated_at trigger); this mirror is
// for server-side queries only.
//
// Phase 6 stock semantics: a MISSING row means the product is untracked (no
// stock source exists yet — the Phase 4 seed leaves inventory empty), so it
// stays always sellable up to the 1..99 line cap. A row is a hard cap: its
// quantity is units remaining and 0 is sold out. Enforcement lives in the
// api-server via @workspace/pricing (stockState / canHoldQuantity).
export const inventoryTable = pgTable("inventory", {
  productId: text("product_id").primaryKey(),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Inventory = typeof inventoryTable.$inferSelect;
export type NewInventory = typeof inventoryTable.$inferInsert;
