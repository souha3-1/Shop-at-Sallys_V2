import { bigint, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// orders — Phase 2 commerce table, written server-side by checkout
// (api-server, Phase 5). reference is allocated from public.order_reference_seq
// ('SS-0001'...). profile_id stays NULL for guest checkout until Phase 7.
// The SQL migrations are the source of truth.
export const ordersTable = pgTable(
  "orders",
  {
    // identity column (Phase 2 migration); never set on insert.
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    reference: text("reference").notNull().unique(),
    profileId: uuid("profile_id"),
    status: text("status").notNull().default("pending"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    customerNote: text("customer_note"),
    subtotalDa: integer("subtotal_da").notNull(),
    deliveryFeeDa: integer("delivery_fee_da").notNull().default(0),
    totalDa: integer("total_da").notNull(),
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;
