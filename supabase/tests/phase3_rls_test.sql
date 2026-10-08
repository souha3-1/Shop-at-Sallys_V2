-- Phase 3 — grants & RLS tests
--
-- Run against an ISOLATED local database only (never production):
--   pnpm exec supabase db reset
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase3_rls_test.sql
--
-- Simulates each Data API role the way PostgREST does: SET ROLE plus
-- request.jwt.claims for auth.uid(). Everything runs in one transaction that
-- is ROLLED BACK at the end. ON_ERROR_STOP means any uncaught exception
-- (including deliberate 'TEST FAILED' raises) fails with non-zero exit status.
-- SET ROLE / set_config happen at top level (outside exception blocks) so
-- they survive subtransaction rollbacks.

begin;

-- ---------------------------------------------------------------------------
-- SECTION 0 — seed (as postgres, RLS does not apply to the table owner)
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, sort_order) values ('mugs', 'Mugs', 1);

insert into public.collections (slug, name, is_published, display_number)
values ('pub-coll', 'Published Collection', true, '01');
insert into public.collections (slug, name, is_published, display_number)
values ('draft-coll', 'Draft Collection', false, '02');

insert into public.products (id, name, price_da, category_slug, collection_slug, status)
values ('active-prod', 'Active Product', 2000, 'mugs', 'pub-coll', 'active');
insert into public.products (id, name, price_da, category_slug, collection_slug, status)
values ('draft-prod', 'Draft Product', 3000, 'mugs', 'pub-coll', 'draft');

insert into public.inventory (product_id, quantity) values ('active-prod', 10);

insert into auth.users (id, email) values ('aaaaaaaa-0000-0000-0000-00000000000a', 'user-a@example.com');
insert into auth.users (id, email) values ('bbbbbbbb-0000-0000-0000-00000000000b', 'user-b@example.com');
insert into public.profiles (id, email, full_name)
values ('aaaaaaaa-0000-0000-0000-00000000000a', 'user-a@example.com', 'User A');
insert into public.profiles (id, email, full_name, is_admin)
values ('bbbbbbbb-0000-0000-0000-00000000000b', 'user-b@example.com', 'User B', true);

insert into public.orders (reference, profile_id, status, contact_name, contact_phone,
                           shipping_address, subtotal_da, total_da)
values ('SS-7001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'pending', 'User A', '0550000001',
        'Algiers', 2000, 2000);
insert into public.orders (reference, profile_id, status, contact_name, contact_phone,
                           shipping_address, subtotal_da, total_da)
values ('SS-7002', 'bbbbbbbb-0000-0000-0000-00000000000b', 'pending', 'User B', '0550000002',
        'Algiers', 3000, 3000);

insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
select id, 'active-prod', 'Active Product', 2000, 1 from public.orders where reference = 'SS-7001';
insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
select id, 'draft-prod', 'Draft Product', 3000, 1 from public.orders where reference = 'SS-7002';

-- ---------------------------------------------------------------------------
-- SECTION A — as anon (public visitor)
-- ---------------------------------------------------------------------------
set role anon;

do $$
declare n integer;
begin
  select count(*) into n from public.categories;
  if n <> 1 then raise exception 'TEST FAILED: anon categories = %, expected 1', n; end if;

  select count(*) into n from public.collections;
  if n <> 1 then raise exception 'TEST FAILED: anon sees % collections, expected 1 (published only)', n; end if;

  select count(*) into n from public.products;
  if n <> 1 then raise exception 'TEST FAILED: anon sees % products, expected 1 (active only)', n; end if;
  if exists (select 1 from public.products where id = 'draft-prod') then
    raise exception 'TEST FAILED: anon can see draft product';
  end if;

  select count(*) into n from public.inventory;
  if n <> 1 then raise exception 'TEST FAILED: anon inventory = %, expected 1', n; end if;
end $$;

-- private tables must be denied at GRANT level for anon
do $$
begin
  select count(*) from public.profiles;
  raise exception 'TEST FAILED: anon could read profiles';
exception when insufficient_privilege then
  if sqlerrm not like 'permission denied%' then
    raise exception 'TEST FAILED: anon profiles denied for wrong reason: %', sqlerrm;
  end if;
end $$;

do $$
begin
  select count(*) from public.orders;
  raise exception 'TEST FAILED: anon could read orders';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  select count(*) from public.order_items;
  raise exception 'TEST FAILED: anon could read order_items';
exception when insufficient_privilege then null;
end $$;

-- anon has no write grants anywhere
do $$
begin
  insert into public.categories (slug, name) values ('evil', 'Evil');
  raise exception 'TEST FAILED: anon could insert a category';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.products set price_da = 1 where id = 'active-prod';
  raise exception 'TEST FAILED: anon could update products';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-9990', 'X', '0550000009', 'Nowhere', 1, 1);
  raise exception 'TEST FAILED: anon could insert an order';
exception when insufficient_privilege then null;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- SECTION B — as authenticated, user A (NOT admin)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', false);
set role authenticated;

do $$
declare n integer;
begin
  if auth.uid() is distinct from 'aaaaaaaa-0000-0000-0000-00000000000a'::uuid then
    raise exception 'TEST FAILED: auth.uid() did not pick up jwt claims (got %)', auth.uid();
  end if;

  -- profiles: own row only
  select count(*) into n from public.profiles where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  if n <> 1 then raise exception 'TEST FAILED: user A cannot see own profile'; end if;
  select count(*) into n from public.profiles where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  if n <> 0 then raise exception 'TEST FAILED: user A can see admin profile via RLS'; end if;

  -- own order visible, other order hidden
  select count(*) into n from public.orders;
  if n <> 1 then raise exception 'TEST FAILED: user A sees % orders, expected 1', n; end if;
  if exists (select 1 from public.orders where reference = 'SS-7002') then
    raise exception 'TEST FAILED: user A can see user B order';
  end if;
  select count(*) into n from public.order_items;
  if n <> 1 then raise exception 'TEST FAILED: user A sees % order items, expected 1', n; end if;

  -- catalog: active only, draft hidden
  select count(*) into n from public.products;
  if n <> 1 or exists (select 1 from public.products where id = 'draft-prod') then
    raise exception 'TEST FAILED: user A sees draft products';
  end if;
end $$;

-- profile edit: allowed columns work
do $$
declare full_name_value text;
begin
  update public.profiles set full_name = 'User A Renamed'
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  select full_name into full_name_value from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  if full_name_value <> 'User A Renamed' then
    raise exception 'TEST FAILED: user A could not update own full_name';
  end if;
end $$;

-- privilege escalation: is_admin must be denied at GRANT level
do $$
declare adm boolean;
begin
  update public.profiles set is_admin = true
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  raise exception 'TEST FAILED: user A self-granted is_admin';
exception when insufficient_privilege then
  -- PostgreSQL reports a table-level 42501 ("permission denied for table
  -- profiles") when the statement only touches columns outside the column
  -- grant, so assert the resulting STATE instead of matching a message.
  select is_admin into adm from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  if adm then
    raise exception 'TEST FAILED: is_admin denial did not preserve is_admin=false';
  end if;
end $$;

-- email belongs to Supabase Auth, not client updates
do $$
begin
  update public.profiles set email = 'stolen@example.com'
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  raise exception 'TEST FAILED: user A could rewrite own email via Data API';
exception when insufficient_privilege then null;
end $$;

-- cannot insert profiles at all (signup flow creates them server-side)
do $$
begin
  insert into public.profiles (id, email)
  values ('cccccccc-0000-0000-0000-00000000000c', 'ghost@example.com');
  raise exception 'TEST FAILED: authenticated could insert a profile';
exception when insufficient_privilege then null;
end $$;

-- non-admin catalog writes are blocked by RLS (grants exist, policies do not)
do $$
begin
  insert into public.products (id, name, price_da, category_slug, collection_slug, status)
  values ('sneaky-prod', 'Sneaky', 100, 'mugs', 'pub-coll', 'active');
  raise exception 'TEST FAILED: non-admin inserted a product';
exception when others then
  if sqlerrm not like '%row-level security%' then
    raise exception 'TEST FAILED: product insert blocked for wrong reason [%]: %', sqlstate, sqlerrm;
  end if;
end $$;

do $$
declare n integer;
begin
  update public.products set price_da = 1 where id = 'active-prod';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: non-admin updated % product rows', n; end if;
  delete from public.products where id = 'active-prod';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'TEST FAILED: non-admin deleted % product rows', n; end if;
end $$;

-- price must be unchanged after the blocked update
do $$
declare p integer;
begin
  select price_da into p from public.products where id = 'active-prod';
  if p <> 2000 then raise exception 'TEST FAILED: price changed to % after blocked update', p; end if;
end $$;

-- order writes are service-side only: no grants for authenticated
do $$
begin
  insert into public.orders (reference, contact_name, contact_phone, shipping_address, subtotal_da, total_da)
  values ('SS-9991', 'X', '0550000009', 'Nowhere', 1, 1);
  raise exception 'TEST FAILED: authenticated could insert an order';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  update public.orders set status = 'delivered' where reference = 'SS-7001';
  raise exception 'TEST FAILED: authenticated could update an order';
exception when insufficient_privilege then null;
end $$;

do $$
begin
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'active-prod', 'X', 1, 1 from public.orders where reference = 'SS-7001';
  raise exception 'TEST FAILED: authenticated could insert an order item';
exception when insufficient_privilege then null;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- SECTION C — as authenticated, user B (ADMIN)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', false);
set role authenticated;

do $$
declare n integer;
begin
  -- admin sees everything, including drafts and unpublished collections
  select count(*) into n from public.products;
  if n <> 2 then raise exception 'TEST FAILED: admin sees % products, expected 2', n; end if;
  select count(*) into n from public.collections;
  if n <> 2 then raise exception 'TEST FAILED: admin sees % collections, expected 2', n; end if;

  -- admin can read all orders and all profiles
  select count(*) into n from public.orders;
  if n <> 2 then raise exception 'TEST FAILED: admin sees % orders, expected 2', n; end if;
  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'TEST FAILED: admin sees % profiles, expected 2', n; end if;
end $$;

-- admin catalog CRUD works end to end
do $$
declare n integer;
begin
  insert into public.categories (slug, name, sort_order) values ('tote-bags', 'Totes', 2);
  update public.categories set name = 'Canvas Totes' where slug = 'tote-bags';
  select count(*) into n from public.categories where name = 'Canvas Totes';
  if n <> 1 then raise exception 'TEST FAILED: admin category update lost'; end if;
  delete from public.categories where slug = 'tote-bags';
  if exists (select 1 from public.categories where slug = 'tote-bags') then
    raise exception 'TEST FAILED: admin category delete lost';
  end if;
end $$;

-- admin can manage other profiles (allowed columns only)
do $$
declare v text;
begin
  update public.profiles set full_name = 'User A Renamed By Admin'
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  select full_name into v from public.profiles
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  if v <> 'User A Renamed By Admin' then
    raise exception 'TEST FAILED: admin could not update another profile';
  end if;
end $$;

-- even admins cannot grant admin via the Data API (is_admin is service-side)
do $$
begin
  update public.profiles set is_admin = false
   where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
  raise exception 'TEST FAILED: admin could flip is_admin through the Data API';
exception when insufficient_privilege then null;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- SECTION D — as service_role (server-side trusted logic)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '', false);
set role service_role;

do $$
declare n integer;
begin
  -- checkout simulation: create an order + item with no client policy
  insert into public.orders (reference, profile_id, status, contact_name, contact_phone,
                             shipping_address, subtotal_da, total_da)
  values ('SS-7003', 'aaaaaaaa-0000-0000-0000-00000000000a', 'confirmed', 'User A', '0550000001',
          'Algiers', 2000, 2500);
  insert into public.order_items (order_id, product_id, product_name, unit_price_da, quantity)
  select id, 'active-prod', 'Active Product', 2000, 1 from public.orders where reference = 'SS-7003';

  select count(*) into n from public.order_items oi
    join public.orders o on o.id = oi.order_id where o.reference = 'SS-7003';
  if n <> 1 then raise exception 'TEST FAILED: service_role order/item creation'; end if;

  -- stock decrement + admin flag management
  update public.inventory set quantity = quantity - 1 where product_id = 'active-prod';
  update public.profiles set is_admin = false
   where id = 'bbbbbbbb-0000-0000-0000-00000000000b';

  -- service_role reads everything
  select count(*) into n from public.products;
  if n <> 2 then raise exception 'TEST FAILED: service_role sees % products, expected 2', n; end if;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- SECTION E — postgres sanity after service_role changes
-- ---------------------------------------------------------------------------
do $$
declare n integer; q integer; adm boolean;
begin
  select count(*) into n from public.orders where reference = 'SS-7003';
  if n <> 1 then raise exception 'TEST FAILED: service_role order not persisted'; end if;
  select quantity into q from public.inventory where product_id = 'active-prod';
  if q <> 9 then raise exception 'TEST FAILED: service_role stock decrement lost (q=%)', q; end if;
  select is_admin into adm from public.profiles
   where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  if adm then raise exception 'TEST FAILED: service_role is_admin update lost'; end if;
end $$;

rollback;

\echo PHASE 3 RLS TESTS PASSED
