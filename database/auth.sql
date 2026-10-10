-- Portfolio-only Auth setup. Run database/schema.sql first as the project operator.
-- Idempotent and transactional; no existing non-portfolio tables/triggers are changed.
begin;

create schema if not exists portfolio_private;
revoke all on schema portfolio_private from public, anon, authenticated, service_role;
alter default privileges in schema portfolio_private revoke execute on functions from public;

alter table public.portfolio_profiles add column if not exists username text;
alter table public.portfolio_profiles add column if not exists owner_admin_granted boolean not null default false;
create unique index if not exists portfolio_profiles_username_idx on public.portfolio_profiles(username);

-- This function has no visitor/service-role EXECUTE grant and lives outside exposed schemas.
-- It reads the actual Auth identity, never caller-supplied email or authorization metadata.
-- SECURITY DEFINER is necessary only for the trusted Auth trigger to write protected profiles.
create or replace function portfolio_private.sync_profile(auth_user_id uuid, require_username boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account auth.users%rowtype;
  existing_profile public.portfolio_profiles%rowtype;
  has_profile boolean;
  owner_email constant text := 'safikasultana90@gmail.com';
  normalized_email text;
  verified_owner boolean;
  candidate_username text;
  fallback_attempt integer := 0;
  is_fallback boolean := false;
begin
  select * into account from auth.users where id = auth_user_id;
  if not found then return; end if;

  select * into existing_profile from public.portfolio_profiles where user_id = account.id;
  has_profile := found;
  normalized_email := pg_catalog.lower(account.email);
  verified_owner := normalized_email = owner_email and account.email_confirmed_at is not null;

  -- Users of another app sharing this Supabase project are left untouched.
  if not has_profile and normalized_email is distinct from owner_email
    and (account.raw_user_meta_data ->> 'app') is distinct from 'safika_portfolio' then
    return;
  end if;

  -- Email-based registration is the supported flow. Removing an owner's email revokes access.
  if normalized_email is null then
    if has_profile and (existing_profile.owner_admin_granted or pg_catalog.lower(existing_profile.email) = owner_email) then
      update public.portfolio_profiles set role = 'viewer', owner_admin_granted = false where user_id = account.id;
    end if;
    return;
  end if;

  if has_profile and existing_profile.username is not null then
    -- Username and display name are not overwritten by later user-editable metadata.
    update public.portfolio_profiles
    set email = normalized_email,
        role = case
          when verified_owner then 'super_admin'
          when existing_profile.owner_admin_granted
            or pg_catalog.lower(existing_profile.email) = owner_email
            or normalized_email = owner_email then 'viewer'
          else existing_profile.role
        end,
        owner_admin_granted = verified_owner
    where user_id = account.id;
    return;
  end if;

  candidate_username := pg_catalog.lower(pg_catalog.btrim(coalesce(account.raw_user_meta_data ->> 'username', '')));
  if require_username and candidate_username !~ '^[a-z0-9_]{3,30}$' then
    raise exception using errcode = '23514', message = 'A valid username is required.';
  end if;
  if candidate_username = 'safika_owner' and normalized_email <> owner_email then
    if require_username then
      raise exception using errcode = '23514', message = 'This username is reserved.';
    end if;
    candidate_username := '';
  end if;

  if candidate_username !~ '^[a-z0-9_]{3,30}$' then
    candidate_username := case when normalized_email = owner_email then 'safika_owner'
      else 'user_' || pg_catalog.substr(pg_catalog.replace(account.id::text, '-', ''), 1, 25) end;
    is_fallback := true;
  end if;

  -- A duplicate requested username rejects a new registration atomically.
  -- Legacy accounts receive a stable fallback without overwriting another user's username.
  while exists (select 1 from public.portfolio_profiles where username = candidate_username
    and user_id is distinct from account.id) loop
    if require_username and not is_fallback then
      raise exception using errcode = '23505', message = 'This username is already in use.', constraint = 'portfolio_profiles_username_idx';
    end if;
    fallback_attempt := fallback_attempt + 1;
    if fallback_attempt > 100 then
      raise exception using errcode = '23505', message = 'Unable to allocate a unique username.';
    end if;
    candidate_username := 'user_' || pg_catalog.substr(pg_catalog.md5(account.id::text || ':' || fallback_attempt::text), 1, 25);
    is_fallback := true;
  end loop;

  if has_profile then
    update public.portfolio_profiles
    set email = normalized_email,
        username = candidate_username,
        role = case
          when verified_owner then 'super_admin'
          when existing_profile.owner_admin_granted
            or pg_catalog.lower(existing_profile.email) = owner_email
            or normalized_email = owner_email then 'viewer'
          else existing_profile.role
        end,
        owner_admin_granted = verified_owner
    where user_id = account.id;
  else
    insert into public.portfolio_profiles (user_id, email, username, full_name, role, owner_admin_granted)
    values (account.id, normalized_email, candidate_username,
      case when normalized_email = owner_email then 'Safika Sultana' else candidate_username end,
      case when verified_owner then 'super_admin' else 'viewer' end, verified_owner);
  end if;
end;
$$;
revoke all on function portfolio_private.sync_profile(uuid, boolean) from public, anon, authenticated, service_role;

create or replace function portfolio_private.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A trigger-only entry point; direct calls cannot manufacture an Auth identity.
  if tg_table_schema <> 'auth' or tg_table_name <> 'users' or tg_op not in ('INSERT', 'UPDATE') then
    raise exception 'Invalid Auth trigger context';
  end if;
  perform portfolio_private.sync_profile(new.id,
    tg_op = 'INSERT' and (new.raw_user_meta_data ->> 'app') = 'safika_portfolio');
  return new;
end;
$$;
revoke all on function portfolio_private.sync_auth_profile() from public, anon, authenticated, service_role;

-- The uniquely named trigger coexists with other applications' Auth triggers.
drop trigger if exists portfolio_sync_auth_profile on auth.users;
create trigger portfolio_sync_auth_profile
after insert or update of email, email_confirmed_at on auth.users
for each row execute function portfolio_private.sync_auth_profile();

-- Backfill only portfolio members and the verified owner, not all shared-project users.
do $$
declare
  account_id uuid;
  orphan_profile record;
  candidate_username text;
  fallback_attempt integer;
begin
  for account_id in
    select account.id from auth.users as account
    where (pg_catalog.lower(account.email) = 'safikasultana90@gmail.com' and account.email_confirmed_at is not null)
      or account.raw_user_meta_data ->> 'app' = 'safika_portfolio'
      or exists (select 1 from public.portfolio_profiles where user_id = account.id)
    order by account.created_at, account.id
  loop
    perform portfolio_private.sync_profile(account_id, false);
  end loop;

  -- Preserve operator-created legacy rows without attaching them to an unproven identity.
  for orphan_profile in select id, email from public.portfolio_profiles where username is null order by id loop
    candidate_username := case when pg_catalog.lower(orphan_profile.email) = 'safikasultana90@gmail.com'
      then 'safika_owner' else 'user_' || pg_catalog.substr(pg_catalog.replace(orphan_profile.id::text, '-', ''), 1, 25) end;
    fallback_attempt := 0;
    while exists (select 1 from public.portfolio_profiles where username = candidate_username) loop
      fallback_attempt := fallback_attempt + 1;
      if fallback_attempt > 100 then raise exception 'Unable to allocate a legacy username'; end if;
      candidate_username := 'user_' || pg_catalog.substr(pg_catalog.md5(orphan_profile.id::text || ':' || fallback_attempt::text), 1, 25);
    end loop;
    update public.portfolio_profiles set username = candidate_username where id = orphan_profile.id;
  end loop;
end;
$$;

alter table public.portfolio_profiles alter column username set not null;
do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.portfolio_profiles'::pg_catalog.regclass and conname = 'portfolio_profiles_username_format') then
    alter table public.portfolio_profiles add constraint portfolio_profiles_username_format check (username ~ '^[a-z0-9_]{3,30}$');
  end if;
end;
$$;

-- Visitor accounts can read only their own profile; they cannot create/edit roles or usernames.
alter table public.portfolio_profiles enable row level security;
revoke all on public.portfolio_profiles from public, anon, authenticated;
grant select on public.portfolio_profiles to authenticated;
grant all on public.portfolio_profiles to service_role;
drop policy if exists "portfolio_profiles read own role" on public.portfolio_profiles;
drop policy if exists "portfolio profiles read own role" on public.portfolio_profiles;
create policy "portfolio profiles read own role" on public.portfolio_profiles
for select to authenticated using ((select auth.uid()) = user_id);

commit;
