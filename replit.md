# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (default
  port 5000; on this machine use `PORT=5001` — see the ports gotcha below)
- `npx supabase start` / `npx supabase db reset` — local DB (port 55322),
  then `psql` the pgTAP suites in `supabase/tests/` against it
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/pricing/` — **single source of truth for money + stock maths** (pure,
  no I/O): delivery fee rule, subtotal/total, quantity normalization, stock
  state. Used by BOTH the api-server and the storefront so bag and receipt
  can never disagree. Unit tests: `pnpm --filter @workspace/pricing test`
  (node:test, no deps).
- `lib/db/src/schema/` — Drizzle mirrors; SQL migrations in
  `supabase/migrations/` are the source of truth for the schema.
- `lib/api-spec/openapi.yaml` — API contract; regenerate clients with
  `pnpm --filter @workspace/api-spec run codegen` after editing.
- `artifacts/api-server/src/routes/` — cart (guest, stock-validated) and
  checkout (server-authoritative pricing + stock decrement, one transaction).
- `artifacts/shop-at-sallys/` — storefront (Vite + React, catalog read
  straight from Supabase via anon; mutations go through the api-server;
  guest wishlist + order history in localStorage via `src/lib/guest.ts`).

## Architecture decisions

- **Guest carts, no customer accounts (user decision).** The cart is a server
  row keyed by an unguessable uuid held in localStorage. There is no customer
  sign-in, so the "migrate guest cart on sign-in" problem is deliberately out
  of scope — the uuid IS the cart identity. If accounts ever arrive, the plan
  is: attach the existing cart uuid to the profile on first sign-in (merge
  lines by product, max quantity wins), never mint a new cart.
- **Stock semantics:** `inventory` row = tracked hard cap; missing row =
  untracked = always sellable (the Phase 4 seed leaves inventory empty on
  purpose). Enforced server-side on add/update (409 `out_of_stock`) and at
  checkout (row locks `FOR UPDATE`, in product_id order, then decrement).
  `stock_available` is exposed read-only on cart lines and in the catalog.
- **Never trust the client:** prices, stock and totals are recomputed from
  the DB inside the checkout transaction; the client sends contact details +
  cart id only. Order lines snapshot prices into `order_items` (immutable
  history).
- **Delivery rule** lives once in `lib/pricing` (free ≥ 5,000 DA, flat
  400 DA below) and feeds cart summary, checkout button and the stored order.
  Change it there, nowhere else.
- **409 recovery contract:** `code: 'unavailable'` → client drops the listed
  product_ids and retries; `code: 'out_of_stock'` → client keeps lines and
  asks the customer to reduce quantities; `code: 'empty_cart'` → nothing to
  do.
- **No customer identity anywhere (Phase 7, user decision):** Supabase Auth
  is deliberately NOT introduced — no sign-up/in/out, no sessions, no
  profile rows. Wishlist and order history live in localStorage
  (`src/lib/guest.ts`); the account page renders only what this browser
  knows (guest state, real placed orders — never fabricated data).
  Server-side privacy rests on Phase 3 RLS plus the unguessable cart uuid;
  the `profiles` table exists in the schema but is intentionally unused.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- **No customer accounts.** Do not build sign-in, registration, or
  profile-gated flows for shoppers; carts and checkout stay guest-only.
- **Wishlist is localStorage-only.** No server table, no sync across
  devices — saved pieces and order history stay on the device.
- Payment on delivery (no card/payment data anywhere in the flow).

## Gotchas

- **Ports on this machine:** macOS ControlCenter already owns TCP 5000, so
  the api-server must run on an alternate port (e.g. `PORT=5001`), and the
  storefront dev proxy targets it via `API_PROXY_TARGET=http://localhost:5001`.
  Local Supabase runs on the +100 range (Kong 55321, DB **55322**, Studio
  55323) because another local Supabase project owns the default 54321-54332
  range — `supabase/config.toml` encodes this; don't "fix" it back to defaults
  or `db reset` fails with "port is already allocated". Local
  `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres`.
- After editing `lib/api-spec/openapi.yaml`, run the codegen command above or
  the api-server/storefront will drift from the contract.
- `lib/pricing` is imported by both the server bundle (esbuild) and Vite —
  keep it dependency-free and pure or both builds pay for it.
- The checkout locks inventory rows in sorted product_id order; keep that
  ordering if you add more stock reads inside transactions (deadlock risk).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
