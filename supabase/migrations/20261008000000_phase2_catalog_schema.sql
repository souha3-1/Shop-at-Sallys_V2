-- Phase 2 — Catalog schema
--
-- Source-of-truth decision: Supabase Postgres becomes the authoritative store
-- for all business data. This migration defines ONLY the catalog tables
-- justified by the current storefront (artifacts/shop-at-sallys/src/data/products.ts):
-- 7 hard-coded categories, 5 hard-coded collections, 32 hard-coded products.
--
-- Design notes:
-- * products.id is TEXT and preserves the existing hard-coded slugs (e.g. 'sn-mug')
--   so current storefront links (/product/:id) migrate deliberately without data loss.
-- * price_da is INTEGER whole Algerian dinars — matches current data exactly
--   (1850, 2400, ... DA), avoids floating point, CHECK > 0 enforces valid price.
-- * No RLS policies and no GRANTs here (Phase 3). auto_expose_new_tables=false
--   means these tables are NOT reachable via the Data API until Phase 3 grants
--   access explicitly.
-- * No product/seed data here — catalog data migration belongs to Phase 4.

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories: the 7 object types used by shop filters
-- ('Mugs', 'Posters', 'Notebooks', 'Paper goods', 'Totes', 'Puzzles', 'Accessories')
-- ---------------------------------------------------------------------------
create table public.categories (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null unique check (char_length(name) between 1 and 60),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- collections: the 5 Van Gogh 'rooms' (starry-night, sunflowers, irises,
-- wheatfield, almond-blossoms) including per-collection UI fields used today.
-- ---------------------------------------------------------------------------
create table public.collections (
  slug               text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name               text not null unique check (char_length(name) between 1 and 80),
  short_description  text not null default '',
  description        text not null default '',
  background_css     text not null default '',
  display_number     text not null default '00',
  is_published       boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger collections_set_updated_at
  before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- products: one row per shop object; preserves existing slug ids.
-- status: 'draft' (default, not visible) -> 'active' -> 'archived'.
-- flags mirror featured/isNew/bestSeller in the hard-coded model.
-- image_path holds the current /products/*.png path until Supabase Storage in Phase 4.
-- ---------------------------------------------------------------------------
create table public.products (
  id              text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text not null check (char_length(name) between 1 and 160),
  description     text not null default '',
  details         text not null default '',
  price_da        integer not null check (price_da > 0),
  category_slug   text not null references public.categories (slug),
  collection_slug text not null references public.collections (slug),
  image_path      text,
  status          text not null default 'draft'
                  check (status in ('draft', 'active', 'archived')),
  is_featured     boolean not null default false,
  is_new          boolean not null default false,
  is_best_seller  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index products_category_slug_idx  on public.products (category_slug);
create index products_collection_slug_idx on public.products (collection_slug);
create index products_status_idx         on public.products (status);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- inventory: 1:1 stock record per product, isolated so stock mutations
-- (server-side, Phase 8) never share a table with catalog edits.
-- quantity >= 0 is the core inventory rule; a missing row means 'not stocked yet'.
-- ---------------------------------------------------------------------------
create table public.inventory (
  product_id          text primary key references public.products (id) on delete cascade,
  quantity            integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger inventory_set_updated_at
  before update on public.inventory
  for each row execute function public.set_updated_at();
