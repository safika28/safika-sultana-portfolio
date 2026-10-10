-- Portfolio-only idempotent setup. Other applications and existing rows are preserved.
begin;

create table if not exists public.portfolio_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'viewer' check (role in ('super_admin', 'editor', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.portfolio_profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists portfolio_profiles_auth_user_idx on public.portfolio_profiles(user_id);

create table if not exists public.portfolio_inquiries (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')), created_at timestamptz not null default now()
);
alter table public.portfolio_inquiries add column if not exists subject text not null default '';

create table if not exists public.portfolio_content_records (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('profile','skills','projects','experience','education','certifications','posts','settings')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 80000),
  published boolean not null default false,
  position integer not null default 0 check (position between 0 and 10000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portfolio_content_published_position_idx on public.portfolio_content_records(published, position);
create index if not exists portfolio_inquiries_created_idx on public.portfolio_inquiries(created_at desc);

create table if not exists public.portfolio_contact_rate_limits (
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key (client_hash, window_start)
);

alter table public.portfolio_profiles enable row level security;
alter table public.portfolio_inquiries enable row level security;
alter table public.portfolio_content_records enable row level security;
alter table public.portfolio_contact_rate_limits enable row level security;

-- Remove the original policy that allowed every authenticated user to promote roles.
drop policy if exists "admin manage all" on public.portfolio_profiles;
drop policy if exists "portfolio_profiles read own role" on public.portfolio_profiles;
create policy "portfolio_profiles read own role" on public.portfolio_profiles for select to authenticated using ((select auth.uid()) = user_id);
-- No authenticated INSERT/UPDATE/DELETE profile policy: role assignment is an operator action.
revoke all on public.portfolio_profiles from anon, authenticated;
grant select on public.portfolio_profiles to authenticated;
grant all on public.portfolio_profiles to service_role;

revoke all on public.portfolio_content_records from anon, authenticated;
grant select on public.portfolio_content_records to anon, authenticated;
grant insert, update, delete on public.portfolio_content_records to authenticated;
grant all on public.portfolio_content_records to service_role;
drop policy if exists "published content read" on public.portfolio_content_records;
create policy "published content read" on public.portfolio_content_records for select to anon, authenticated using (published = true);
drop policy if exists "editors read content" on public.portfolio_content_records;
create policy "editors read content" on public.portfolio_content_records for select to authenticated using (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));
drop policy if exists "editors insert content" on public.portfolio_content_records;
create policy "editors insert content" on public.portfolio_content_records for insert to authenticated with check (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings'))));
drop policy if exists "editors update content" on public.portfolio_content_records;
create policy "editors update content" on public.portfolio_content_records for update to authenticated using (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings')))) with check (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings'))));
drop policy if exists "admins delete content" on public.portfolio_content_records;
create policy "admins delete content" on public.portfolio_content_records for delete to authenticated using (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and role = 'super_admin'));

-- Contact submission only through a validated, throttled server route.
revoke all on public.portfolio_inquiries from anon, authenticated;
grant select on public.portfolio_inquiries to authenticated;
grant update (status) on public.portfolio_inquiries to authenticated;
grant all on public.portfolio_inquiries to service_role;
drop policy if exists "editors read portfolio_inquiries" on public.portfolio_inquiries;
create policy "editors read portfolio_inquiries" on public.portfolio_inquiries for select to authenticated using (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));
drop policy if exists "editors update portfolio_inquiries" on public.portfolio_inquiries;
create policy "editors update portfolio_inquiries" on public.portfolio_inquiries for update to authenticated using (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and role in ('super_admin','editor'))) with check (exists (select 1 from public.portfolio_profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));

revoke all on public.portfolio_contact_rate_limits from anon, authenticated;
grant all on public.portfolio_contact_rate_limits to service_role;
-- Invoker privileges only. This RPC is inaccessible to visitors and signed-in clients.
create or replace function public.portfolio_consume_contact_limit(client_hash text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  total integer;
begin
  if client_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid limiter key'; end if;
  insert into public.portfolio_contact_rate_limits as limits(client_hash, window_start, attempts)
  values (client_hash, bucket, 1)
  on conflict on constraint portfolio_contact_rate_limits_pkey do update set attempts = limits.attempts + 1
  returning attempts into total;
  delete from public.portfolio_contact_rate_limits where window_start < now() - interval '1 day';
  return total <= 5;
end;
$$;
revoke all on function public.portfolio_consume_contact_limit(text) from public, anon, authenticated;
grant execute on function public.portfolio_consume_contact_limit(text) to service_role;
commit;
