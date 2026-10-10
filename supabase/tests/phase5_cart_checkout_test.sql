-- Phase 5 — cart + checkout tests
--
-- Run against an ISOLATED local database only (never production), from the
-- repo root (the \i paths below are cwd-relative):
--   pnpm exec supabase db reset
--   /opt/homebrew/opt/libpq/bin/psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase5_cart_checkout_test.sql
--
-- Structure:
--   Section A replays the Phase 5 migration at top level to prove re-running
--   is a no-op (IF NOT EXISTS / drop-and-create triggers / CREATE SEQUENCE IF
--   NOT EXISTS). This creates no rows, so no rollback is needed.
--   Section B asserts schema behaviour: the 1..99 quantity CHECK, the
--   one-line-per-product unique, FK integrity, cascade on cart delete,
--   RESTRICT on product delete, and updated_at triggers.
--   Section C proves the Data API closure in rolled-back transactions:
--   anon and authenticated cannot even see carts/cart_items (no grants), the
--   catalog stays readable, and service_role retains full access.
--   Section D replays the checkout semantics the api-server implements
--   (live-price cart view, 'SS-XXXX' reference allocation, immutable price
--   snapshots) inside a rolled-back transaction.
-- ON_ERROR_STOP means any uncaught exception (including deliberate 'TEST
-- FAILED' raises) fails the run with a non-zero exit status.

-- ---------------------------------------------------------------------------
-- SECTION A — replay migration (idempotency)
-- ---------------------------------------------------------------------------
\i supabase/migrations/20261008000400_phase5_cart_checkout.sql

do $$
declare n integer;
begin
  select count(*) into n from public.carts;
  if n <> 0 then raise exception 'TEST FAILED: replay created % carts, expected 0', n; end if;
  select count(*) into n from public.cart_items;
  if n <> 0 then raise exception 'TEST FAILED: replay created % cart_items, expected 0', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- SECTION B — schema behaviour: constraints, FKs, triggers
-- ---------------------------------------------------------------------------

-- Guest cart inserts fine with no profile (Phase 7 attaches later).
insert into public.carts (id) values ('11111111-1111-1111-1111-111111111111');

-- Basic line insert (products come from the Phase 4 seed).
insert into public.cart_items (cart_id, product_id, quantity)
values ('11111111-1111-1111-1111-111111111111', 'sn-mug', 2);

-- unique (cart_id, product_id): one line per product per cart.
do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  values ('11111111-1111-1111-1111-111111111111', 'sn-mug', 1);
  raise exception 'TEST FAILED: duplicate cart line accepted';
exception when unique_violation then null;
end $$;

-- quantity CHECK: 0 and 100 are rejected, 1 and 99 are accepted.
do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  values ('11111111-1111-1111-1111-111111111111', 'sf-note', 0);
  raise exception 'TEST FAILED: quantity 0 accepted';
exception when check_violation then null;
end $$;

do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  values ('11111111-1111-1111-1111-111111111111', 'sf-note', 100);
  raise exception 'TEST FAILED: quantity 100 accepted';
exception when check_violation then null;
end $$;

insert into public.cart_items (cart_id, product_id, quantity)
values ('11111111-1111-1111-1111-111111111111', 'sf-note', 99);

-- FK: lines must reference a real product.
do $$
begin
  insert into public.cart_items (cart_id, product_id, quantity)
  values ('11111111-1111-1111-1111-111111111111', 'no-such-product', 1);
  raise exception 'TEST FAILED: line with unknown product accepted';
exception when foreign_key_violation then null;
end $$;

-- updated_at trigger fires on line updates (later transaction => later now()).
update public.cart_items set quantity = 3
 where cart_id = '11111111-1111-1111-1111-111111111111' and product_id = 'sn-mug';

do $$
declare bad integer;
begin
  select count(*) into bad from public.cart_items
   where product_id = 'sn-mug' and updated_at <= created_at;
  if bad <> 0 then raise exception 'TEST FAILED: cart_items.updated_at not bumped'; end if;
end $$;

-- updated_at trigger fires on cart updates too.
update public.carts set profile_id = null where id = '11111111-1111-1111-1111-111111111111';

do $$
declare bad integer;
begin
  select count(*) into bad from public.carts
   where id = '11111111-1111-1111-1111-111111111111' and updated_at <= created_at;
  if bad <> 0 then raise exception 'TEST FAILED: carts.updated_at not bumped'; end if;
end $$;

-- A product with someone's items in a bag must be archived, not deleted
-- (RESTRICT, same policy as order_items.product_id).
do $$
begin
  delete from public.products where id = 'sn-mug';
  raise exception 'TEST FAILED: product with cart lines was deletable';
exception when foreign_key_violation then null;
end $$;

-- Cascade: deleting the cart removes its lines.
delete from public.carts where id = '11111111-1111-1111-1111-111111111111';

do $$
declare n integer;
begin
  select count(*) into n from public.cart_items where cart_id = '11111111-1111-1111-1111-111111111111';
  if n <> 0 then raise exception 'TEST FAILED: % lines survived cart delete', n; end if;
end $$;

-- ---------------------------------------------------------------------------
-- SECTION C — Data API closure (rolled back; SET ROLE is transactional)
-- ---------------------------------------------------------------------------
begin;

insert into public.carts (id) values ('22222222-2222-2222-2222-222222222222');
insert into public.cart_items (cart_id, product_id, quantity)
values ('22222222-2222-2222-2222-222222222222', 'sn-mug', 1);

-- anon: no grants on carts/cart_items at all.
do $$
begin
  set role anon;
  perform count(*) from public.carts;
  raise exception 'TEST FAILED: anon can read carts';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$
begin
  set role anon;
  perform count(*) from public.cart_items;
  raise exception 'TEST FAILED: anon can read cart_items';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$
begin
  set role anon;
  insert into public.carts default values;
  raise exception 'TEST FAILED: anon can create carts';
exception when insufficient_privilege then null;
end $$;
reset role;

-- authenticated: same closure — carts are server-side only, like orders.
do $$
begin
  set role authenticated;
  perform count(*) from public.carts;
  raise exception 'TEST FAILED: authenticated can read carts';
exception when insufficient_privilege then null;
end $$;
reset role;

do $$
begin
  set role authenticated;
  insert into public.cart_items (cart_id, product_id, quantity)
  values ('22222222-2222-2222-2222-222222222222', 'sn-mug', 1);
  raise exception 'TEST FAILED: authenticated can write cart_items';
exception when insufficient_privilege then null;
end $$;
reset role;

-- Regression: the catalog itself stays publicly readable.
do $$
declare n integer;
begin
  set role anon;
  select count(*) into n from public.products where status = 'active';
  reset role;
  if n <> 32 then raise exception 'TEST FAILED: anon sees % active products, expected 32', n; end if;
end $$;

-- service_role keeps full server-side access (bypasses RLS by attribute).
do $$
declare n integer;
begin
  set role service_role;
  select count(*) into n from public.carts;
  reset role;
  if n <> 1 then raise exception 'TEST FAILED: service_role sees % carts, expected 1', n; end if;
end $$;

rollback;

-- ---------------------------------------------------------------------------
-- SECTION D — checkout semantics (rolled back; mirrors api-server logic)
-- ---------------------------------------------------------------------------
begin;

insert into public.carts (id) values ('33333333-3333-3333-3333-333333333333');
insert into public.cart_items (cart_id, product_id, quantity) values
  ('33333333-3333-3333-3333-333333333333', 'sn-mug', 2),   -- 1850 DA each
  ('33333333-3333-3333-3333-333333333333', 'sf-note', 1);  -- 1350 DA each

-- Live-price cart view (the api-server's inner join on active products).
do $$
declare subtotal integer;
begin
  select sum(p.price_da * ci.quantity) into subtotal
    from public.cart_items ci
    join public.products p on p.id = ci.product_id and p.status = 'active'
   where ci.cart_id = '33333333-3333-3333-3333-333333333333';
  if subtotal <> 1850 * 2 + 1350 then
    raise exception 'TEST FAILED: cart subtotal = %, expected 5050', subtotal;
  end if;
end $$;

-- Reference allocation from the sequence matches the Phase 2 CHECK and is
-- unique across calls (nextval is non-transactional, so values are consumed
-- even though this section rolls back — that is fine, nothing asserts
-- absolute numbers).
do $$
declare ref text;
begin
  select 'SS-' || lpad(nextval('public.order_reference_seq')::text, 4, '0') into ref;
  if ref !~ '^SS-[0-9]{4,10}$' then
    raise exception 'TEST FAILED: reference % does not match orders CHECK', ref;
  end if;
end $$;

do $$
declare ref1 text; ref2 text;
begin
  select 'SS-' || lpad(nextval('public.order_reference_seq')::text, 4, '0') into ref1;
  select 'SS-' || lpad(nextval('public.order_reference_seq')::text, 4, '0') into ref2;
  if ref1 = ref2 then raise exception 'TEST FAILED: sequence reused reference %', ref1; end if;
end $$;

-- Place an order the way checkout does: reference from the sequence, money
-- recomputed server-side, lines snapshotted, cart emptied.
insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, delivery_fee_da, total_da)
select 'SS-' || lpad(nextval('public.order_reference_seq')::text, 4, '0'),
       'Test Buyer', '0550000000', 'Algiers, Algeria', 5050, 0, 5050;

insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
select o.id, ci.product_id, p.name, p.price_da, ci.quantity
  from public.orders o
  join public.cart_items ci on ci.cart_id = '33333333-3333-3333-3333-333333333333'
  join public.products p on p.id = ci.product_id
 where o.contact_name = 'Test Buyer';

delete from public.cart_items where cart_id = '33333333-3333-3333-3333-333333333333';

do $$
declare n integer; total integer;
begin
  select count(*) into n from public.cart_items where cart_id = '33333333-3333-3333-3333-333333333333';
  if n <> 0 then raise exception 'TEST FAILED: checkout left % cart lines', n; end if;

  select count(*) into n from public.carts where id = '33333333-3333-3333-3333-333333333333';
  if n <> 1 then raise exception 'TEST FAILED: checkout deleted the cart row itself'; end if;

  select count(*) into n from public.order_items oi join public.orders o on o.id = oi.order_id
   where o.contact_name = 'Test Buyer';
  if n <> 2 then raise exception 'TEST FAILED: order has % items, expected 2', n; end if;

  select sum(line_total_da) into total from public.order_items oi
    join public.orders o on o.id = oi.order_id where o.contact_name = 'Test Buyer';
  if total <> 5050 then raise exception 'TEST FAILED: order total = %, expected 5050', total; end if;

  if (select reference from public.orders where contact_name = 'Test Buyer') !~ '^SS-[0-9]{4,10}$' then
    raise exception 'TEST FAILED: stored reference violates orders CHECK';
  end if;
end $$;

-- Snapshot immutability: a later price change moves the live cart view but
-- never the order history (this is why cart_items stores no price column).
update public.products set price_da = 9999 where id = 'sn-mug';

do $$
declare live integer; snap integer;
begin
  select sum(p.price_da * ci.quantity) into live
    from public.cart_items ci join public.products p on p.id = ci.product_id
   where ci.cart_id = '33333333-3333-3333-3333-333333333333';
  if coalesce(live, 0) <> 0 then
    raise exception 'TEST FAILED: expected emptied cart view, got %', live;
  end if;

  select sum(oi.line_total_da) into snap from public.order_items oi
    join public.orders o on o.id = oi.order_id where o.contact_name = 'Test Buyer';
  if snap <> 5050 then
    raise exception 'TEST FAILED: order snapshot drifted to % after price change', snap;
  end if;
end $$;

rollback;

\echo PHASE 5 CART + CHECKOUT TESTS PASSED
