-- Idempotent setup SQL. Existing profile/project/post/inquiry rows are preserved.
begin;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'viewer' check (role in ('super_admin', 'editor', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists profiles_auth_user_idx on public.profiles(user_id);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), title text not null, summary text,
  image_url text, published boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  excerpt text, body text, published boolean not null default false,
  created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null, message text not null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')), created_at timestamptz not null default now()
);
alter table public.inquiries add column if not exists subject text not null default '';

create table if not exists public.content_records (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('profile','skills','projects','experience','education','certifications','posts','settings')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 80000),
  published boolean not null default false,
  position integer not null default 0 check (position between 0 and 10000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_published_position_idx on public.content_records(published, position);
create index if not exists inquiries_created_idx on public.inquiries(created_at desc);

create table if not exists public.contact_rate_limits (
  client_hash text not null check (client_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key (client_hash, window_start)
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.blog_posts enable row level security;
alter table public.inquiries enable row level security;
alter table public.content_records enable row level security;
alter table public.contact_rate_limits enable row level security;

-- Remove the original policy that allowed every authenticated user to promote roles.
drop policy if exists "admin manage all" on public.profiles;
drop policy if exists "profiles read own role" on public.profiles;
create policy "profiles read own role" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
-- No authenticated INSERT/UPDATE/DELETE profile policy: role assignment is an operator action.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Legacy tables remain readable only for explicitly published content.
drop policy if exists "public read published content" on public.projects;
create policy "public read published content" on public.projects for select to anon, authenticated using (published = true);
drop policy if exists "public read published posts" on public.blog_posts;
create policy "public read published posts" on public.blog_posts for select to anon, authenticated using (published = true);
grant select on public.projects, public.blog_posts to anon, authenticated;
grant all on public.projects, public.blog_posts to service_role;

revoke all on public.content_records from anon, authenticated;
grant select on public.content_records to anon, authenticated;
grant insert, update, delete on public.content_records to authenticated;
grant all on public.content_records to service_role;
drop policy if exists "published content read" on public.content_records;
create policy "published content read" on public.content_records for select to anon, authenticated using (published = true);
drop policy if exists "editors read content" on public.content_records;
create policy "editors read content" on public.content_records for select to authenticated using (exists (select 1 from public.profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));
drop policy if exists "editors insert content" on public.content_records;
create policy "editors insert content" on public.content_records for insert to authenticated with check (exists (select 1 from public.profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings'))));
drop policy if exists "editors update content" on public.content_records;
create policy "editors update content" on public.content_records for update to authenticated using (exists (select 1 from public.profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings')))) with check (exists (select 1 from public.profiles where user_id = (select auth.uid()) and (role = 'super_admin' or (role = 'editor' and section <> 'settings'))));
drop policy if exists "admins delete content" on public.content_records;
create policy "admins delete content" on public.content_records for delete to authenticated using (exists (select 1 from public.profiles where user_id = (select auth.uid()) and role = 'super_admin'));

-- Contact submission only through a validated, throttled server route.
revoke all on public.inquiries from anon, authenticated;
grant select on public.inquiries to authenticated;
grant update (status) on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
drop policy if exists "editors read inquiries" on public.inquiries;
create policy "editors read inquiries" on public.inquiries for select to authenticated using (exists (select 1 from public.profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));
drop policy if exists "editors update inquiries" on public.inquiries;
create policy "editors update inquiries" on public.inquiries for update to authenticated using (exists (select 1 from public.profiles where user_id = (select auth.uid()) and role in ('super_admin','editor'))) with check (exists (select 1 from public.profiles where user_id = (select auth.uid()) and role in ('super_admin','editor')));

revoke all on public.contact_rate_limits from anon, authenticated;
grant all on public.contact_rate_limits to service_role;
-- Invoker privileges only. This RPC is inaccessible to visitors and signed-in clients.
create or replace function public.consume_contact_limit(client_hash text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  total integer;
begin
  if client_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid limiter key'; end if;
  insert into public.contact_rate_limits as limits(client_hash, window_start, attempts)
  values (client_hash, bucket, 1)
  on conflict on constraint contact_rate_limits_pkey do update set attempts = limits.attempts + 1
  returning attempts into total;
  delete from public.contact_rate_limits where window_start < now() - interval '1 day';
  return total <= 5;
end;
$$;
revoke all on function public.consume_contact_limit(text) from public, anon, authenticated;
grant execute on function public.consume_contact_limit(text) to service_role;
commit;
