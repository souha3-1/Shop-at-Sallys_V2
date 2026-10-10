-- Phase 5 — server-side cart + checkout reference sequence
--
-- Cart/checkout server integration (per PR #4's "Next phase"). The storefront
-- cart was an in-memory useState that died on reload and a checkout form that
-- called a no-op. This migration adds the persistence layer; the api-server
-- (Express, DATABASE_URL, trusted side) owns ALL reads and writes — exactly
-- like orders: carts are NOT exposed through the Data API.
--
-- Design notes:
-- * carts.id is a uuid the browser holds in localStorage and sends with every
--   cart call. It is an unguessable bearer capability for a guest cart;
--   profile_id stays NULL until Phase 7 (auth) attaches sessions to carts.
-- * cart_items deliberately stores NO price: a cart is not a purchase, so the
--   server reads live products.price_da on every read and at checkout.
--   order_items snapshots unit_price_da at purchase time (Phase 2).
-- * quantity 1..99: 1 is the minimum meaningful line, 99 caps runaway inputs;
--   'Add to bag' increments happen server-side and re-check this bound.
-- * unique (cart_id, product_id): one line per product; quantity carries the
--   amount, matching the storefront's merge-on-add behaviour.
-- * order_reference_seq generates orders.reference ('SS-0001'...) server-side
--   at checkout, so reference allocation is race-free (sequence nextval) and
--   unique by construction. Phase 2's CHECK '^SS-[0-9]{4,10}$' applies.
-- * RLS enabled with NO policies and grants revoked for anon/authenticated:
--   carts are as invisible to the Data API as orders are. service_role keeps
--   full access for future trusted paths (Phase 7/8).
-- This migration changes no existing rows and creates no customer data.

-- ---------------------------------------------------------------------------
-- carts: one row per shopping bag. Guest-owned today (profile_id NULL),
-- attachable to a profile when auth lands in Phase 7.
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists carts_profile_id_idx on public.carts (profile_id);

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cart_items: product lines in a cart. No price column (see header) — the
-- server joins products for live pricing. Cascade: deleting a cart removes
-- its lines; deleting a product is RESTRICT (default), same as order_items:
-- a product in someone's bag must be archived, not deleted.
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  id          bigint generated always as identity primary key,
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  text not null references public.products (id),
  quantity    integer not null check (quantity between 1 and 99),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, product_id)
);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order reference allocation for checkout (server-side, api-server).
-- 'SS-' || lpad(nextval, 4, '0') → SS-0001, SS-0002, ... (Phase 2 CHECK).
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_reference_seq start 1;

-- ---------------------------------------------------------------------------
-- Security: RLS on, no policies, no client grants.
-- auto_expose_new_tables=false already withholds Data API exposure, but
-- Supabase default privileges still GRANT new tables/sequences to the API
-- roles — revoke them explicitly (same belt-and-braces as Phase 3).
-- ---------------------------------------------------------------------------
alter table public.carts      enable row level security;
alter table public.cart_items enable row level security;

revoke all on public.carts, public.cart_items from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;

grant all on public.carts, public.cart_items to service_role;
grant usage, select on all sequences in schema public to service_role;
