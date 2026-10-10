-- Portfolio-only login protection. No other application's tables are modified.
-- Apply once before deploying database/functions/portfolio-auth/index.ts.
begin;

create table if not exists public.portfolio_auth_rate_limits (
  identifier_hash text primary key check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default statement_timestamp(),
  attempts smallint not null check (attempts between 1 and 11)
);

alter table public.portfolio_auth_rate_limits enable row level security;
revoke all on table public.portfolio_auth_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.portfolio_auth_rate_limits to service_role;

create or replace function public.portfolio_consume_auth_limit(identifier_hash text)
returns boolean
language plpgsql
security invoker
set search_path = ''
set lock_timeout = '2s'
as $$
declare
  allowed boolean;
  checked_at timestamptz := statement_timestamp();
begin
  if $1 is null or $1 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid login limit key';
  end if;

  -- ON CONFLICT locks this identifier's row, preventing parallel requests from
  -- sharing an attempt. Saturating at eleven avoids integer overflow.
  insert into public.portfolio_auth_rate_limits as limits
    (identifier_hash, window_started_at, attempts)
  values ($1, checked_at, 1)
  on conflict on constraint portfolio_auth_rate_limits_pkey do update
    set window_started_at = case
          when limits.window_started_at <= checked_at - interval '10 minutes'
            then checked_at
          else limits.window_started_at
        end,
        attempts = case
          when limits.window_started_at <= checked_at - interval '10 minutes'
            then 1
          else least(limits.attempts + 1, 11)
        end
  returning attempts <= 10 into allowed;

  return allowed;
end;
$$;

revoke all on function public.portfolio_consume_auth_limit(text) from public, anon, authenticated;
grant execute on function public.portfolio_consume_auth_limit(text) to service_role;

comment on table public.portfolio_auth_rate_limits is
  'SHA-256 context-separated identifiers only; ten portfolio login attempts per ten minutes. Service role may purge rows older than one day.';

commit;
