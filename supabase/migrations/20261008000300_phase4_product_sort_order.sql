-- Phase 4 — deterministic catalog order
--
-- The storefront's curated display order (the order of the hard-coded array in
-- artifacts/shop-at-sallys/src/data/products.ts) is user-visible: the Shop page's
-- default "featured" sort is stable, so ties keep array order, and price/newest
-- sorts show array order within ties. The catalog tables had no column carrying
-- that order, which would have made seeded results non-deterministic.
--
-- products.sort_order mirrors categories.sort_order (same convention, same name)
-- and is seeded by the companion seed migration. No index: 32 rows.

alter table public.products
  add column if not exists sort_order integer not null default 0;
