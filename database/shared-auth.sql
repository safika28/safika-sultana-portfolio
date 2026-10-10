-- Compatibility for the reviewed shared project's existing customer-profile Auth trigger.
-- Run schema.sql and auth.sql first. This preserves all existing customer sync behavior.
-- The source fingerprint deliberately rejects unreviewed function revisions.
begin;

do $portfolio_shared_auth_patch$
declare
  target_function oid := pg_catalog.to_regprocedure('public.handle_new_user()');
  original_function pg_catalog.pg_proc%rowtype;
  patched_function pg_catalog.pg_proc%rowtype;
  original_source text;
  normalized_source text;
  original_definition text;
  patched_source text;
  begin_token text;
  insertion_position integer;
  reviewed_source_hash constant text := '4e29dcc5050b74d6322e4ef47ba6ef4d';
  marker constant text := 'safika-portfolio-shared-auth-guard-v1';
  guard constant text := $portfolio_guard$
  -- safika-portfolio-shared-auth-guard-v1
  -- Existing customer profiles always retain the original sync, even if metadata changes.
  if not exists (select 1 from public.profiles where id = new.id)
    and ((new.raw_user_meta_data ->> 'app') = 'safika_portfolio'
      or exists (select 1 from public.portfolio_profiles where user_id = new.id)) then
    return new;
  end if;
$portfolio_guard$;
begin
  if target_function is null or pg_catalog.to_regclass('public.portfolio_profiles') is null then
    raise exception 'Shared Auth compatibility requires the reviewed handle_new_user function and portfolio schema';
  end if;

  select * into original_function from pg_catalog.pg_proc where oid = target_function;
  if original_function.prorettype <> 'pg_catalog.trigger'::pg_catalog.regtype
    or not original_function.prosecdef
    or (select lanname from pg_catalog.pg_language where oid = original_function.prolang) <> 'plpgsql' then
    raise exception 'Shared Auth function signature or security mode differs from the reviewed version';
  end if;

  -- Verify the exact Auth trigger context instead of patching a similarly named function.
  if not exists (
    select 1 from pg_catalog.pg_trigger as trigger
    where trigger.tgfoid = target_function and trigger.tgrelid = 'auth.users'::pg_catalog.regclass
      and trigger.tgname = 'on_auth_user_changed' and not trigger.tgisinternal
      and trigger.tgtype = 21 and trigger.tgnargs = 0 and trigger.tgqual is null
      and (select pg_catalog.array_agg(attribute.attname::text order by attribute.attname)
        from pg_catalog.pg_attribute as attribute
        where attribute.attrelid = trigger.tgrelid and attribute.attnum = any(trigger.tgattr))
        = array['email', 'phone', 'phone_confirmed_at', 'raw_user_meta_data']::text[]
  ) or exists (
    select 1 from pg_catalog.pg_trigger
    where tgfoid = target_function and not tgisinternal
      and (tgrelid <> 'auth.users'::pg_catalog.regclass or tgname <> 'on_auth_user_changed')
  ) then
    raise exception 'Shared Auth trigger differs from the reviewed Auth-only trigger';
  end if;

  original_source := original_function.prosrc;
  normalized_source := pg_catalog.replace(original_source, E'\r\n', E'\n');

  if pg_catalog.strpos(normalized_source, marker) > 0 then
    -- Idempotency also checks that the complete guard and original reviewed body survive.
    if pg_catalog.strpos(normalized_source, guard) = 0
      or pg_catalog.length(normalized_source) - pg_catalog.length(pg_catalog.replace(normalized_source, guard, '')) <> pg_catalog.length(guard)
      or pg_catalog.md5(pg_catalog.replace(normalized_source, guard, '')) <> reviewed_source_hash then
      raise exception 'Shared Auth compatibility marker exists with an unreviewed or incomplete function body';
    end if;
    return;
  end if;

  if pg_catalog.md5(normalized_source) <> reviewed_source_hash then
    raise exception 'Shared Auth function source changed; review its current definition before applying compatibility';
  end if;

  -- The fingerprint identifies this declaration block and its first standalone BEGIN.
  begin_token := (pg_catalog.regexp_match(original_source, E'(\r?\nbegin)(\r?\n)'))[1];
  if begin_token is null then
    raise exception 'Cannot locate the reviewed shared Auth function BEGIN';
  end if;
  insertion_position := pg_catalog.strpos(original_source, begin_token) + pg_catalog.length(begin_token);
  patched_source := overlay(original_source placing guard from insertion_position for 0);
  original_definition := pg_catalog.pg_get_functiondef(target_function);
  if pg_catalog.strpos(original_definition, original_source) = 0 then
    raise exception 'Cannot preserve the shared Auth function definition';
  end if;

  -- Only the reviewed guard is inserted; declaration, sync, security, and search path remain.
  execute pg_catalog.replace(original_definition, original_source, patched_source);

  select * into patched_function from pg_catalog.pg_proc where oid = target_function;
  if patched_function.proowner is distinct from original_function.proowner
    or patched_function.proacl is distinct from original_function.proacl
    or patched_function.proconfig is distinct from original_function.proconfig
    or patched_function.prosecdef is distinct from original_function.prosecdef then
    raise exception 'Shared Auth function ownership, grants, or security settings changed unexpectedly';
  end if;
end;
$portfolio_shared_auth_patch$;

commit;
