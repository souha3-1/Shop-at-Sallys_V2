import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// products — catalog table (Phase 2 + 4 schema; the SQL migrations in
// supabase/migrations are the source of truth, not drizzle-kit). Defined here
// so the api-server can read live prices when serving carts and checkout.
export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  details: text("details").notNull().default(""),
  priceDa: integer("price_da").notNull(),
  categorySlug: text("category_slug").notNull(),
  collectionSlug: text("collection_slug").notNull(),
  imagePath: text("image_path"),
  status: text("status").notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  isBestSeller: boolean("is_best_seller").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
