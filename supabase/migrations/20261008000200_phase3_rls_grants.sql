-- Phase 3 — security: explicit grants + row-level security
--
-- Goals (per roadmap): public catalog reads, private customer data, private
-- order data, admin-only catalog operations. Grants are EXPLICIT because
-- auto_expose_new_tables = false means no default Data API exposure.
--
-- Design:
-- * anon          : read-only access to the catalog (categories, collections,
--                   products, inventory) — nothing else.
-- * authenticated : same catalog reads; can read ONLY their own profile and
--                   own orders; may edit only full_name/phone on their own
--                   profile (column-level grant, so is_admin can never be
--                   self-granted); catalog WRITES are granted but gated by
--                   admin-only RLS policies.
-- * admin         : an authenticated user whose profiles.is_admin is true
--                   (set server-side only). Admins get full catalog CRUD and
--                   read access to all orders/profiles through RLS policies.
--                   is_admin itself is NOT updatable through the Data API.
-- * service_role  : full access (server-side trusted logic, Phase 8 checkout);
--                   bypasses RLS by attribute.
--
-- No GRANT/policy here touches data; this migration changes no rows.

-- 1. Admin marker on profiles (used by RLS below; the dashboard UI is Phase 9)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Admin predicate. SECURITY DEFINER so the check reads profiles without
--    being subject to profiles RLS (no recursion, stable across policies).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- 3. Enable RLS on every business table
alter table public.categories        enable row level security;
alter table public.collections       enable row level security;
alter table public.products          enable row level security;
alter table public.inventory         enable row level security;
alter table public.profiles          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;

-- 4. Make grants explicit and least-privilege (drop anything inherited from
--    default privileges, then grant exactly what each role needs)
revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;

-- Catalog: public read for anon+authenticated; writes for authenticated are
-- granted but only succeed through admin policies (RLS) below.
grant select on public.categories, public.collections, public.products, public.inventory
  to anon, authenticated;
grant insert, update, delete on public.categories, public.collections, public.products, public.inventory
  to authenticated;

-- Identity: own-row read for authenticated; own-row edit limited to these
-- columns only (email is owned by Supabase Auth; is_admin is service-side).
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Orders: read-only for authenticated; writes are service-side only.
grant select on public.orders, public.order_items to authenticated;

-- Server-side trusted logic gets everything.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- 5. Policies ----------------------------------------------------------------

-- Catalog: public reads
create policy categories_select_public on public.categories
  for select to anon, authenticated using (true);

create policy collections_select_published on public.collections
  for select to anon, authenticated using (is_published);

create policy products_select_active on public.products
  for select to anon, authenticated using (status = 'active');

create policy inventory_select_public on public.inventory
  for select to anon, authenticated using (true);

-- Catalog: admin-only writes (and admins see unpublished/draft rows too,
-- because policies for the same command are OR-ed)
create policy categories_admin_all on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy collections_admin_all on public.collections
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_admin_all on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy inventory_admin_all on public.inventory
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profiles: private customer data — own row only, plus admin read/manage
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Orders: private order data — own orders only, plus admin read.
-- No INSERT/UPDATE/DELETE policies: order writes happen server-side only.
create policy orders_select_own on public.orders
  for select to authenticated using (profile_id = auth.uid());

create policy orders_select_admin on public.orders
  for select to authenticated using (public.is_admin());

create policy order_items_select_own on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.profile_id = auth.uid()
    )
  );

create policy order_items_select_admin on public.order_items
  for select to authenticated using (public.is_admin());
