-- Phase 2 — Identity & commerce schema
--
-- Defines the customer/order tables Phase 3 (RLS) and Phase 8 (checkout) need.
-- No rows of real customer/order data are created anywhere.
--
-- Design notes:
-- * profiles.id references auth.users (created by Supabase Auth, exercised in Phase 7).
--   A single identity source; profile rows are created on signup.
-- * orders.profile_id is NULLABLE: current checkout is guest-based (name/phone/address
--   form with payment on delivery), so orders must work without an account.
-- * Contact/shipping fields are a per-order snapshot so guest orders and order
--   history survive profile changes.
-- * Money: INTEGER whole dinars (price_da), CHECK >= 0; line totals are generated.
-- * order reference format 'SS-0428' matches the existing account-page mock data.

-- ---------------------------------------------------------------------------
-- profiles: private customer data, keyed to Supabase Auth identity.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique
             check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  full_name  text check (full_name is null or char_length(full_name) between 1 and 120),
  phone      text check (phone is null or phone ~ '^\+?[0-9 ()-]{6,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orders: one row per purchase; status drives fulfilment (payment on delivery).
-- reference is the human-facing order number shown in account history.
-- ---------------------------------------------------------------------------
create table public.orders (
  id                bigint generated always as identity primary key,
  reference         text not null unique
                    check (reference ~ '^SS-[0-9]{4,10}$'),
  profile_id        uuid references public.profiles (id) on delete set null,
  status            text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  contact_name      text not null check (char_length(contact_name) between 1 and 120),
  contact_phone     text not null check (contact_phone ~ '^\+?[0-9 ()-]{6,20}$'),
  shipping_address  text not null check (char_length(shipping_address) between 1 and 500),
  customer_note     text,
  subtotal_da       integer not null check (subtotal_da >= 0),
  delivery_fee_da   integer not null default 0 check (delivery_fee_da >= 0),
  total_da          integer not null check (total_da >= 0),
  placed_at         timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_profile_id_idx on public.orders (profile_id);
create index orders_status_idx     on public.orders (status);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items: immutable purchase lines. unit_price_da / product_name snapshot
-- the product at purchase time so order history never drifts. product_id is
-- RESTRICT (default): a product with order history must be archived, not deleted.
-- ---------------------------------------------------------------------------
create table public.order_items (
  id             bigint generated always as identity primary key,
  order_id       bigint not null references public.orders (id) on delete cascade,
  product_id     text not null references public.products (id),
  product_name   text not null check (char_length(product_name) between 1 and 160),
  unit_price_da  integer not null check (unit_price_da >= 0),
  quantity       integer not null check (quantity > 0),
  line_total_da  integer generated always as (unit_price_da * quantity) stored,
  created_at     timestamptz not null default now(),
  unique (order_id, product_id)
);

create index order_items_order_id_idx   on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
