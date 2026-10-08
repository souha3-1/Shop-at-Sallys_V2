-- Phase 2 — schema & constraint tests
--
-- Run against an ISOLATED local database only (never production):
--   pnpm exec supabase db reset
--   /opt/homebrew/opt/libpq/bin/psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase2_schema_test.sql
--
-- Every statement runs inside one transaction that is ROLLED BACK at the end,
-- so the script leaves no test data behind. ON_ERROR_STOP means any uncaught
-- exception (including the deliberate 'TEST FAILED' raises) fails the run
-- with a non-zero exit status.

begin;

-- ---------------------------------------------------------------------------
-- VALID INSERTS
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, sort_order) values ('mugs', 'Mugs', 1);
insert into public.categories (slug, name, sort_order) values ('posters', 'Posters', 2);

insert into public.collections (slug, name, short_description, description, background_css, display_number, is_published)
values ('starry-night', 'Starry Night', 'The blue hour', 'Cobalt skies and tiny galaxies.',
        'linear-gradient(135deg, #243B5A 0%, #3F6691 42%, #B9A4D6 100%)', '01', true);

insert into public.products (id, name, description, details, price_da, category_slug, collection_slug,
                             image_path, status, is_featured, is_best_seller)
values ('sn-mug', 'Midnight Garden Mug', 'A generous stoneware mug for late starts.',
        'Printed in small batches and packed in our Algiers studio.', 1850, 'mugs', 'starry-night',
        '/products/starry-night-mug.png', 'active', true, true);

insert into public.products (id, name, price_da, category_slug, collection_slug, status)
values ('sn-poster', 'Night Window Art Print', 2400, 'posters', 'starry-night', 'draft');

-- inventory: zero stock is a valid state
insert into public.inventory (product_id, quantity, low_stock_threshold) values ('sn-mug', 0, 5);
insert into public.inventory (product_id, quantity, low_stock_threshold) values ('sn-poster', 12, 3);

-- profiles (auth.users rows are normally created by Supabase Auth in Phase 7)
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'customer-one@example.com');
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'customer-two@example.com');
insert into public.profiles (id, email, full_name, phone)
values ('11111111-1111-1111-1111-111111111111', 'customer-one@example.com', 'Amina Belkacem', '0550000000');
-- phone is nullable
insert into public.profiles (id, email, full_name, phone)
values ('22222222-2222-2222-2222-222222222222', 'customer-two@example.com', 'Sara Boutef', null);

-- guest order (profile_id NULL) and account order
insert into public.orders (reference, profile_id, status, contact_name, contact_phone, shipping_address,
                           customer_note, subtotal_da, delivery_fee_da, total_da)
values ('SS-0428', null, 'pending', 'Amina Belkacem', '05 50 00 00 00', 'Hydra, Algiers',
        'Gift, please wrap with care', 3700, 0, 3700);

insert into public.orders (reference, profile_id, status, contact_name, contact_phone, shipping_address,
                           customer_note, subtotal_da, delivery_fee_da, total_da)
values ('SS-0429', '11111111-1111-1111-1111-111111111111', 'confirmed', 'Amina Belkacem', '0550000000',
        'El Biar, Algiers', null, 1850, 500, 2350);

insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
select id, 'sn-mug', 'Midnight Garden Mug', 1850, 2 from public.orders where reference = 'SS-0428';

insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
select id, 'sn-poster', 'Night Window Art Print', 2400, 1 from public.orders where reference = 'SS-0429';

-- generated column computes line total
do $$
begin
  if (select line_total_da from public.order_items oi join public.orders o on o.id = oi.order_id
      where o.reference = 'SS-0428') <> 3700 then
    raise exception 'TEST FAILED: line_total_da generation';
  end if;
end $$;

-- updated_at trigger fires on update
do $$
begin
  update public.products set updated_at = now() - interval '1 day', name = name where id = 'sn-mug';
  if (select updated_at from public.products where id = 'sn-mug') <= now() - interval '1 hour' then
    raise exception 'TEST FAILED: set_updated_at trigger did not fire on products';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- REJECTED INSERTS / VIOLATIONS
-- ---------------------------------------------------------------------------

-- duplicate category slug
do $$
begin
  insert into public.categories (slug, name) values ('mugs', 'Duplicate slug');
  raise exception 'TEST FAILED: duplicate category slug accepted';
exception when unique_violation then null;
end $$;

-- duplicate collection slug
do $$
begin
  insert into public.collections (slug, name) values ('starry-night', 'Duplicate');
  raise exception 'TEST FAILED: duplicate collection slug accepted';
exception when unique_violation then null;
end $$;

-- duplicate product id (existing slugs must stay unique)
do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug)
  values ('sn-mug', 'Clone', 1000, 'mugs', 'starry-night');
  raise exception 'TEST FAILED: duplicate product id accepted';
exception when unique_violation then null;
end $$;

-- price rules: zero and negative rejected
do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug)
  values ('bad-price-zero', 'Free thing', 0, 'mugs', 'starry-night');
  raise exception 'TEST FAILED: zero price accepted';
exception when check_violation then null;
end $$;

do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug)
  values ('bad-price-negative', 'Negative', -100, 'mugs', 'starry-night');
  raise exception 'TEST FAILED: negative price accepted';
exception when check_violation then null;
end $$;

-- invalid product status
do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug, status)
  values ('bad-status', 'Bad status', 1000, 'mugs', 'starry-night', 'sold-out-soon');
  raise exception 'TEST FAILED: invalid product status accepted';
exception when check_violation then null;
end $$;

-- product FK violations: unknown category / collection
do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug)
  values ('bad-category', 'X', 1000, 'does-not-exist', 'starry-night');
  raise exception 'TEST FAILED: unknown category accepted';
exception when foreign_key_violation then null;
end $$;

do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug)
  values ('bad-collection', 'X', 1000, 'mugs', 'does-not-exist');
  raise exception 'TEST FAILED: unknown collection accepted';
exception when foreign_key_violation then null;
end $$;

-- inventory rules: negative quantity rejected, unknown product FK
do $$
begin
  insert into public.inventory (product_id, quantity) values ('sn-mug', -1);
  raise exception 'TEST FAILED: negative inventory accepted';
exception when check_violation then null;
end $$;

do $$
begin
  insert into public.inventory (product_id, quantity) values ('ghost-product', 5);
  raise exception 'TEST FAILED: inventory for unknown product accepted';
exception when foreign_key_violation then null;
end $$;

-- profile FK: id must exist in auth.users
do $$
begin
  insert into public.profiles (id, email)
  values ('99999999-9999-9999-9999-999999999999', 'ghost@example.com');
  raise exception 'TEST FAILED: profile without auth user accepted';
exception when foreign_key_violation then null;
end $$;

-- duplicate profile email (second auth user, same email)
do $$
begin
  insert into public.profiles (id, email)
  values ('22222222-2222-2222-2222-222222222222', 'customer-one@example.com');
  raise exception 'TEST FAILED: duplicate profile email accepted';
exception when unique_violation then null;
end $$;

-- invalid profile email format
do $$
begin
  insert into public.profiles (id, email)
  values ('22222222-2222-2222-2222-222222222222', 'not-an-email');
  raise exception 'TEST FAILED: invalid profile email accepted';
exception when check_violation then null;
end $$;

-- duplicate order reference
do $$
begin
  insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-0428', 'Impostor', '0550000001', 'Nowhere', 100, 100);
  raise exception 'TEST FAILED: duplicate order reference accepted';
exception when unique_violation then null;
end $$;

-- invalid order reference format
do $$
begin
  insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('ORDER-1', 'X', '0550000001', 'Nowhere', 100, 100);
  raise exception 'TEST FAILED: malformed order reference accepted';
exception when check_violation then null;
end $$;

-- invalid order status
do $$
begin
  insert into public.orders (reference, status, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-9999', 'exploded', 'X', '0550000001', 'Nowhere', 100, 100);
  raise exception 'TEST FAILED: invalid order status accepted';
exception when check_violation then null;
end $$;

-- order requires contact phone (not-null)
do $$
begin
  insert into public.orders (reference, contact_name, shipping_address, subtotal_da, total_da)
  values ('SS-9998', 'X', 'Nowhere', 100, 100);
  raise exception 'TEST FAILED: order without contact_phone accepted';
exception when not_null_violation then null;
end $$;

-- negative order totals rejected
do $$
begin
  insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-9997', 'X', '0550000001', 'Nowhere', -1, -1);
  raise exception 'TEST FAILED: negative order total accepted';
exception when check_violation then null;
end $$;

-- order with unknown profile FK
do $$
begin
  insert into public.orders (reference, profile_id, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-9996', '99999999-9999-9999-9999-999999999999', 'X', '0550000001', 'Nowhere', 100, 100);
  raise exception 'TEST FAILED: order with unknown profile accepted';
exception when foreign_key_violation then null;
end $$;

-- order item quantity must be > 0
do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'sn-mug', 'Mug', 1850, 0 from public.orders where reference = 'SS-0428';
  raise exception 'TEST FAILED: zero order item quantity accepted';
exception when check_violation then null;
end $$;

-- order item unit price must be >= 0
do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'sn-poster', 'Print', -5, 1 from public.orders where reference = 'SS-0428';
  raise exception 'TEST FAILED: negative unit price accepted';
exception when check_violation then null;
end $$;

-- unique (order_id, product_id)
do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'sn-mug', 'Mug', 1850, 1 from public.orders where reference = 'SS-0428';
  raise exception 'TEST FAILED: duplicate order item accepted';
exception when unique_violation then null;
end $$;

-- order item FK violations: unknown order / unknown product
do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  values (-1, 'sn-mug', 'Mug', 1850, 1);
  raise exception 'TEST FAILED: order item for unknown order accepted';
exception when foreign_key_violation then null;
end $$;

do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'ghost-product', 'Ghost', 100, 1 from public.orders where reference = 'SS-0428';
  raise exception 'TEST FAILED: order item for unknown product accepted';
exception when foreign_key_violation then null;
end $$;

-- ---------------------------------------------------------------------------
-- ON DELETE BEHAVIOUR
-- ---------------------------------------------------------------------------

-- a product with order history must not be deletable (RESTRICT)
do $$
begin
  begin
    delete from public.products where id = 'sn-mug';
    raise exception 'TEST FAILED: product with order history was deleted';
  exception when foreign_key_violation then null;
  end;
  if not exists (select 1 from public.products where id = 'sn-mug') then
    raise exception 'TEST FAILED: product disappeared after rejected delete';
  end if;
end $$;

-- deleting an order cascades to its items, and the order must be gone
do $$
begin
  delete from public.orders where reference = 'SS-0429';
  if exists (select 1 from public.orders where reference = 'SS-0429') then
    raise exception 'TEST FAILED: order not deleted';
  end if;
  if exists (select 1 from public.order_items where product_id = 'sn-poster') then
    raise exception 'TEST FAILED: order items not cascaded';
  end if;
end $$;

rollback;

\echo PHASE 2 SCHEMA TESTS PASSED
