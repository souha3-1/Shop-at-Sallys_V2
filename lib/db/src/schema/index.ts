// Export your models here. Add one export per file
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types.
//
// NOTE: the SQL migrations in supabase/migrations are the source of truth for
// the database schema (constraints, defaults, generated columns, RLS). These
// Drizzle definitions mirror them for server-side queries only — do not run
// drizzle-kit push against the Supabase-managed schema.

export * from "./products";
export * from "./carts";
export * from "./cart-items";
export * from "./orders";
export * from "./order-items";
