-- Phase 4 — catalog seed tests
--
-- Run against an ISOLATED local database only (never production), from the
-- repo root (the \i paths below are cwd-relative):
--   pnpm exec supabase db reset
--   /opt/homebrew/opt/libpq/bin/psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase4_seed_test.sql
--
-- Structure:
--   Section A replays both Phase 4 migrations at top level to prove re-running
--   is a no-op (ON CONFLICT DO NOTHING / IF NOT EXISTS). This creates no rows,
--   so no rollback is needed and the seed itself stays untouched.
--   Section B asserts counts and exact values against the storefront source.
--   Section C checks anon RLS visibility of the seed inside a rolled-back
--   transaction (SET ROLE is transactional, so rollback restores the role).
-- ON_ERROR_STOP means any uncaught exception (including deliberate 'TEST
-- FAILED' raises) fails the run with a non-zero exit status.

-- ---------------------------------------------------------------------------
-- SECTION A — replay migrations (idempotency)
-- ---------------------------------------------------------------------------
\i supabase/migrations/20261008000300_phase4_product_sort_order.sql
\i supabase/migrations/20261008000310_phase4_catalog_seed.sql

do $$
declare n integer;
begin
  select count(*) into n from public.categories;
  if n <> 7 then raise exception 'TEST FAILED: re-seed changed category count to %', n; end if;
  select count(*) into n from public.collections;
  if n <> 5 then raise exception 'TEST FAILED: re-seed changed collection count to %', n; end if;
  select count(*) into n from public.products;
  if n <> 32 then raise exception 'TEST FAILED: re-seed changed product count to %', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- SECTION B — counts, integrity, exact storefront parity
-- ---------------------------------------------------------------------------
do $$
declare n integer;
begin
  -- shape: 7 / 5 / 32, inventory intentionally empty (no stock source yet)
  select count(*) into n from public.categories;   if n <> 7 then raise exception 'TEST FAILED: categories = %, expected 7', n; end if;
  select count(*) into n from public.collections;  if n <> 5 then raise exception 'TEST FAILED: collections = %, expected 5', n; end if;
  select count(*) into n from public.products;     if n <> 32 then raise exception 'TEST FAILED: products = %, expected 32', n; end if;
  select count(*) into n from public.inventory;    if n <> 0 then raise exception 'TEST FAILED: inventory seeded % rows, expected 0', n; end if;

  -- visibility state: every seeded row matches the storefront (all public today)
  select count(*) into n from public.products where status <> 'active';
  if n <> 0 then raise exception 'TEST FAILED: % products not active', n; end if;
  select count(*) into n from public.collections where not is_published;
  if n <> 0 then raise exception 'TEST FAILED: % collections unpublished', n; end if;

  -- referential integrity: no product points at a missing category/collection
  select count(*) into n from public.products p
    left join public.categories c on c.slug = p.category_slug
    left join public.collections co on co.slug = p.collection_slug
   where c.slug is null or co.slug is null;
  if n <> 0 then raise exception 'TEST FAILED: % products with broken FK joins', n; end if;

  -- category display order preserved (Mugs first ... Accessories last)
  if (select array_agg(name order by sort_order) from public.categories)
     <> array['Mugs','Posters','Notebooks','Paper goods','Totes','Puzzles','Accessories'] then
    raise exception 'TEST FAILED: category order = %',
      (select array_agg(name order by sort_order) from public.categories);
  end if;

  -- curated product order: positions 0..31, each used once
  select count(distinct sort_order) into n from public.products;
  if n <> 32 then raise exception 'TEST FAILED: distinct product sort_order = %, expected 32', n; end if;
  if (select min(sort_order) from public.products) <> 0
     or (select max(sort_order) from public.products) <> 31 then
    raise exception 'TEST FAILED: product sort_order range %..% expected 0..31',
      (select min(sort_order) from public.products), (select max(sort_order) from public.products);
  end if;

  -- exact values (locks SQL <-> storefront parity, incl. apostrophe escaping)
  if (select price_da from public.products where id = 'sn-mug') <> 1850 then
    raise exception 'TEST FAILED: sn-mug price';
  end if;
  if (select sort_order from public.products where id = 'sn-mug') <> 0 then
    raise exception 'TEST FAILED: sn-mug should lead the curated order';
  end if;
  if (select name from public.products where id = 'sn-stargazers-candle') <> 'Stargazer''s Dream Candle' then
    raise exception 'TEST FAILED: apostrophe round-trip (got %)',
      (select name from public.products where id = 'sn-stargazers-candle');
  end if;
  if (select price_da from public.products where id = 'sn-gift-box') <> 5000 then
    raise exception 'TEST FAILED: sn-gift-box price';
  end if;
  if (select short_description from public.collections where slug = 'almond-blossoms') <> 'A gentler spring' then
    raise exception 'TEST FAILED: almond-blossoms short description';
  end if;
  if (select display_number from public.collections where slug = 'almond-blossoms') <> '05' then
    raise exception 'TEST FAILED: almond-blossoms display number';
  end if;
  if (select display_number from public.collections where slug = 'starry-night') <> '01' then
    raise exception 'TEST FAILED: starry-night display number';
  end if;
  if (select name from public.categories where slug = 'paper-goods') <> 'Paper goods' then
    raise exception 'TEST FAILED: paper-goods category name';
  end if;

  -- flag parity with the hard-coded storefront (homepage shows featured items)
  select count(*) into n from public.products where is_featured;
  if n <> 2 then raise exception 'TEST FAILED: featured = %, expected 2', n; end if;
  select count(*) into n from public.products where is_new;
  if n <> 5 then raise exception 'TEST FAILED: is_new = %, expected 5', n; end if;
  select count(*) into n from public.products where is_best_seller;
  if n <> 2 then raise exception 'TEST FAILED: best_seller = %, expected 2', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- SECTION C — anon sees exactly the public catalog (Phase 3 RLS + seed)
-- ---------------------------------------------------------------------------
begin;

insert into public.categories (slug, name, sort_order) values ('never-shown', 'Never Shown', 99);
insert into public.collections (slug, name, is_published, display_number)
values ('draft-coll', 'Draft Coll', false, '99');
insert into public.products (id, name, price_da, category_slug, collection_slug, status)
values ('draft-prod', 'Draft Prod', 100, 'never-shown', 'draft-coll', 'draft');

set role anon;

do $$
declare n integer;
begin
  select count(*) into n from public.categories;
  if n <> 8 then raise exception 'TEST FAILED: anon sees % categories, expected 8 (seed 7 + 1)', n; end if;
  select count(*) into n from public.collections;
  if n <> 5 then raise exception 'TEST FAILED: anon sees % collections, expected 5 (draft hidden)', n; end if;
  select count(*) into n from public.products;
  if n <> 32 then raise exception 'TEST FAILED: anon sees % products, expected 32 (draft hidden)', n; end if;
end $$;

rollback;

\echo PHASE 4 SEED TESTS PASSED
