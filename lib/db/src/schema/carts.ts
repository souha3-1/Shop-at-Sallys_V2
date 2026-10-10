import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

// carts — Phase 5 server-side shopping bags. id is an unguessable uuid the
// browser holds in localStorage and presents with every cart call (bearer
// capability for a guest cart). profile_id stays NULL until Phase 7 auth
// attaches sessions. The SQL migrations are the source of truth; the FK to
// profiles is not mirrored here because no profiles table is defined yet.
export const cartsTable = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Cart = typeof cartsTable.$inferSelect;
