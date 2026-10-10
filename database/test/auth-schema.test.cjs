// Integration suite for the actual PostgreSQL setup scripts.
// PGLITE_MODULE_PATH may point to an isolated installation of @electric-sql/pglite.
// No Supabase credentials or network services are used.
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');

const databaseDirectory = path.resolve(__dirname, '..');
const setupFiles = ['schema.sql', 'auth.sql', 'auth-rate-limit.sql'];
const sharedSetupFile = 'shared-auth.sql';
const uuid = (value) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
// Exact reviewed source from the shared project's existing customer-profile trigger.
// Keeping this realistic fixture catches required-phone/full-name signup conflicts.
const sharedAuthSource = `
declare
  normalized_email text := nullif(lower(trim(new.email)), '');
  normalized_phone text := nullif(new.phone, '');
  normalized_name text := nullif(trim(new.raw_user_meta_data ->> 'full_name'), '');
begin
  if normalized_phone is not null then
    normalized_phone := regexp_replace(normalized_phone, '[^0-9]', '', 'g');
    if normalized_phone ~ '^[1-9][0-9]{7,14}$' then
      normalized_phone := '+' || normalized_phone;
    else
      normalized_phone := null;
    end if;
  end if;

  insert into public.profiles (
    id,
    email,
    phone,
    phone_verified_at,
    full_name,
    requires_account_completion
  )
  values (
    new.id,
    normalized_email,
    normalized_phone,
    new.phone_confirmed_at,
    normalized_name,
    false
  )
  on conflict (id) do update set
    email = normalized_email,
    phone = normalized_phone,
    phone_verified_at = new.phone_confirmed_at,
    full_name = coalesce(normalized_name, public.profiles.full_name),
    requires_account_completion = case
      when normalized_phone is not null
        and new.phone_confirmed_at is not null
        and length(coalesce(normalized_name, public.profiles.full_name, '')) >= 2
      then false
      else public.profiles.requires_account_completion
    end;
  return new;
end;
`;

test('portfolio SQL protects Auth, CMS, and rate limits in a shared project', async (context) => {
  const database = await PGlite.create();
  const query = (sql, values) => database.query(sql, values);
  const rows = async (sql, values) => (await query(sql, values)).rows;
  const role = (name) => database.exec(name ? `SET ROLE ${name}` : 'RESET ROLE');
  const claim = (id) => query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  const runSetup = async () => {
    for (const file of setupFiles) await database.exec(fs.readFileSync(path.join(databaseDirectory, file), 'utf8'));
    await database.exec(fs.readFileSync(path.join(databaseDirectory, sharedSetupFile), 'utf8'));
  };

  try {
    await database.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE ROLE supabase_auth_admin;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (
        id uuid PRIMARY KEY,
        email text UNIQUE,
        email_confirmed_at timestamptz,
        phone text,
        phone_confirmed_at timestamptz,
        raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      );
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      GRANT USAGE ON SCHEMA auth TO authenticated, supabase_auth_admin;
      GRANT SELECT, INSERT, UPDATE ON auth.users TO supabase_auth_admin;
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email text,
        phone text NOT NULL,
        phone_verified_at timestamptz,
        full_name text NOT NULL,
        requires_account_completion boolean NOT NULL DEFAULT false,
        role text NOT NULL DEFAULT 'customer'
      );
      CREATE TABLE public.products (id integer PRIMARY KEY, name text);
      INSERT INTO public.products VALUES (1, 'existing product');
      CREATE TABLE public.categories (id integer PRIMARY KEY, name text);
      INSERT INTO public.categories VALUES (1, 'existing category');
      CREATE TABLE public.permissions (id integer PRIMARY KEY, name text);
      INSERT INTO public.permissions VALUES (1, 'existing permission');
      CREATE FUNCTION auth.other_app_trigger() RETURNS trigger LANGUAGE plpgsql AS
        $$BEGIN RETURN NEW; END$$;
      CREATE TRIGGER other_app_trigger AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION auth.other_app_trigger();
    `);
    await database.exec(`CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
      SET search_path TO 'public', 'pg_temp' AS $function$${sharedAuthSource.replace(/\n/g, '\r\n')}$function$;
      CREATE TRIGGER on_auth_user_changed AFTER INSERT OR UPDATE OF email, phone, phone_confirmed_at, raw_user_meta_data
        ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`);
    const customerFunctionBefore = (await rows("SELECT proowner, proacl::text, proconfig::text, prosecdef FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure"))[0];
    const customerTriggerBefore = (await rows("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='on_auth_user_changed'"))[0].definition;
    await query('INSERT INTO auth.users (id, email, email_confirmed_at, phone, raw_user_meta_data) VALUES ($1, $2, now(), $3, $4), ($5, $6, NULL, $7, $8)',
      [uuid(1), 'someone@other-app.test', '918888111111', JSON.stringify({ full_name: 'Other App Customer' }),
        uuid(2), 'safikasultana90@gmail.com', '918888222222', JSON.stringify({ full_name: 'Safika Sultana' })]);
    await query("UPDATE public.profiles SET role='other_app_admin' WHERE id=$1", [uuid(1)]);
    const customerProfilesBefore = await rows('SELECT * FROM public.profiles ORDER BY id');
    await runSetup();

    await context.test('backfill excludes unrelated accounts and an unverified unmarked owner', async () => {
      assert.equal((await rows('SELECT count(*)::integer AS count FROM public.portfolio_profiles'))[0].count, 0);
    });

    await context.test('unrelated application rows and Auth trigger remain intact', async () => {
      assert.deepEqual(await rows('SELECT * FROM public.profiles ORDER BY id'), customerProfilesBefore);
      assert.deepEqual(await rows('SELECT * FROM public.products'), [{ id: 1, name: 'existing product' }]);
      assert.deepEqual(await rows('SELECT * FROM public.categories'), [{ id: 1, name: 'existing category' }]);
      assert.deepEqual(await rows('SELECT * FROM public.permissions'), [{ id: 1, name: 'existing permission' }]);
      assert.equal((await rows("SELECT count(*)::integer AS count FROM pg_trigger WHERE tgname = 'other_app_trigger'"))[0].count, 1);
      assert.deepEqual((await rows("SELECT proowner, proacl::text, proconfig::text, prosecdef FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure"))[0], customerFunctionBefore);
      assert.equal((await rows("SELECT pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgname='on_auth_user_changed'"))[0].definition, customerTriggerBefore);
      const installedSource = (await rows("SELECT prosrc FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure"))[0].prosrc;
      const insertedGuard = fs.readFileSync(path.join(databaseDirectory, sharedSetupFile), 'utf8').match(/\$portfolio_guard\$([\s\S]*?)\$portfolio_guard\$/)[1];
      assert.equal(installedSource.replace(/\r\n/g, '\n').replace(insertedGuard, ''), sharedAuthSource);
    });

    await context.test('all created portfolio tables enable RLS and have only scoped references', async () => {
      const tables = await rows("SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace WHERE nspname = 'public' AND relkind = 'r' AND relname LIKE 'portfolio_%'");
      assert.ok(tables.length >= 5);
      assert.ok(tables.every((table) => table.relrowsecurity));
      for (const file of setupFiles) {
        assert.doesNotMatch(fs.readFileSync(path.join(databaseDirectory, file), 'utf8'), /public\.(?!portfolio_)[a-z_]+/);
      }
    });

    await context.test('confirming the owner email grants admin with a canonical fallback username', async () => {
      await query('UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1', [uuid(2)]);
      assert.deepEqual((await rows('SELECT username, role, owner_admin_granted FROM public.portfolio_profiles WHERE user_id = $1', [uuid(2)]))[0],
        { username: 'safika_owner', role: 'super_admin', owner_admin_granted: true });
    });

    await context.test('trusted Auth trigger writes profiles and ignores submitted metadata role', async () => {
      await role('supabase_auth_admin');
      await query('INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES ($1, $2, now(), $3)',
        [uuid(3), 'member@example.test', JSON.stringify({ app: 'safika_portfolio', username: 'Member_3', role: 'super_admin' })]);
      await role();
      assert.deepEqual((await rows('SELECT username, role FROM public.portfolio_profiles WHERE user_id = $1', [uuid(3)]))[0],
        { username: 'member_3', role: 'viewer' });
      assert.deepEqual(await rows('SELECT id FROM public.profiles WHERE id=$1', [uuid(3)]), []);
    });

    await context.test('other-app signup still requires a valid phone and full name', async () => {
      await assert.rejects(() => query('INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ($1,$2,$3)',
        [uuid(8), 'missing-phone@example.test', JSON.stringify({ full_name: 'Other Customer' })]), (error) => error.code === '23502' && error.column === 'phone');
      await assert.rejects(() => query('INSERT INTO auth.users (id,email,phone) VALUES ($1,$2,$3)',
        [uuid(9), 'missing-name@example.test', '918888333333']), (error) => error.code === '23502' && error.column === 'full_name');
      await query('INSERT INTO auth.users (id,email,phone,phone_confirmed_at,raw_user_meta_data) VALUES ($1,$2,$3,now(),$4)',
        [uuid(10), 'new-customer@example.test', '918888333333', JSON.stringify({ full_name: 'New Customer' })]);
      assert.deepEqual((await rows('SELECT phone,full_name,role,requires_account_completion FROM public.profiles WHERE id=$1', [uuid(10)]))[0],
        { phone: '+918888333333', full_name: 'New Customer', role: 'customer', requires_account_completion: false });
      assert.deepEqual(await rows('SELECT user_id FROM public.portfolio_profiles WHERE user_id=$1', [uuid(10)]), []);
    });

    await context.test('existing other-app customer still syncs after adopting portfolio metadata', async () => {
      await query('UPDATE auth.users SET raw_user_meta_data=$2 WHERE id=$1',
        [uuid(10), JSON.stringify({ app: 'safika_portfolio', username: 'customer_10', full_name: 'Updated Customer', role: 'super_admin' })]);
      assert.deepEqual((await rows('SELECT phone,full_name,role FROM public.profiles WHERE id=$1', [uuid(10)]))[0],
        { phone: '+918888333333', full_name: 'Updated Customer', role: 'customer' });
      await query('UPDATE auth.users SET email=$2 WHERE id=$1', [uuid(10), 'updated-customer@example.test']);
      assert.equal((await rows('SELECT email FROM public.profiles WHERE id=$1', [uuid(10)]))[0].email, 'updated-customer@example.test');
      assert.equal((await rows('SELECT role FROM public.portfolio_profiles WHERE user_id=$1', [uuid(10)]))[0].role, 'viewer');
    });

    await context.test('later editable metadata cannot rename or promote a profile', async () => {
      await query('UPDATE auth.users SET raw_user_meta_data = $2 WHERE id = $1',
        [uuid(3), JSON.stringify({ username: 'hijacked', role: 'super_admin' })]);
      await query('UPDATE auth.users SET email = email WHERE id = $1', [uuid(3)]);
      assert.deepEqual((await rows('SELECT username, role FROM public.portfolio_profiles WHERE user_id = $1', [uuid(3)]))[0],
        { username: 'member_3', role: 'viewer' });
      assert.deepEqual(await rows('SELECT id FROM public.profiles WHERE id=$1', [uuid(3)]), []);
    });

    await context.test('unverification and email changes revoke only automatic owner grants', async () => {
      await query('UPDATE auth.users SET email_confirmed_at = NULL WHERE id = $1', [uuid(2)]);
      assert.deepEqual((await rows('SELECT role, owner_admin_granted FROM public.portfolio_profiles WHERE user_id = $1', [uuid(2)]))[0],
        { role: 'viewer', owner_admin_granted: false });
      await query('UPDATE auth.users SET email_confirmed_at = now(), email = $2 WHERE id = $1', [uuid(2), 'SAFIKASULTANA90@GMAIL.COM']);
      assert.equal((await rows('SELECT role FROM public.portfolio_profiles WHERE user_id = $1', [uuid(2)]))[0].role, 'super_admin');
      await query('UPDATE auth.users SET email = $2 WHERE id = $1', [uuid(2), 'former-owner@example.test']);
      assert.deepEqual((await rows('SELECT role, owner_admin_granted FROM public.portfolio_profiles WHERE user_id = $1', [uuid(2)]))[0],
        { role: 'viewer', owner_admin_granted: false });
      await query("UPDATE public.portfolio_profiles SET role = 'editor' WHERE user_id = $1", [uuid(3)]);
      await query('UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1', [uuid(3)]);
      assert.equal((await rows('SELECT role FROM public.portfolio_profiles WHERE user_id = $1', [uuid(3)]))[0].role, 'editor');
      await query('UPDATE auth.users SET email = $2 WHERE id = $1', [uuid(2), 'safikasultana90@gmail.com']);
    });

    await context.test('combined setup is idempotent and creates one own-profile policy', async () => {
      await runSetup();
      assert.deepEqual((await rows('SELECT username, role FROM public.portfolio_profiles WHERE user_id = $1', [uuid(3)]))[0],
        { username: 'member_3', role: 'editor' });
      assert.equal((await rows("SELECT count(*)::integer AS count FROM pg_policies WHERE schemaname = 'public' AND tablename = 'portfolio_profiles'"))[0].count, 1);
    });

    await context.test('shared compatibility fails closed for an unreviewed function body', async () => {
      const definition = (await rows("SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) AS definition"))[0].definition;
      await database.exec('BEGIN');
      try {
        await database.exec(definition.replace('return new;', '-- unreviewed function revision\n    return new;'));
        await assert.rejects(() => database.exec(fs.readFileSync(path.join(databaseDirectory, sharedSetupFile), 'utf8')), /unreviewed or incomplete function body/);
      } finally {
        await database.exec('ROLLBACK');
      }
      assert.equal((await rows("SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) AS definition"))[0].definition, definition);
    });

    await context.test('shared compatibility refuses to patch an unknown original function revision', async () => {
      const current = (await rows("SELECT pg_get_functiondef(oid) AS definition,prosrc FROM pg_proc WHERE oid='public.handle_new_user()'::regprocedure"))[0];
      await database.exec('BEGIN');
      try {
        await database.exec(current.definition.replace(current.prosrc, () => sharedAuthSource.replace('begin\n', 'begin\n  -- unreviewed customer sync revision\n')));
        await assert.rejects(() => database.exec(fs.readFileSync(path.join(databaseDirectory, sharedSetupFile), 'utf8')), /function source changed/);
      } finally {
        await database.exec('ROLLBACK');
      }
      assert.equal((await rows("SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure) AS definition"))[0].definition, current.definition);
    });

    await context.test('duplicate, invalid, and reserved usernames roll back Auth insertion', async () => {
      for (const [id, username, code] of [[4, 'member_3', '23505'], [5, 'x', '23514'], [6, 'safika_owner', '23514']]) {
        await assert.rejects(() => query('INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)',
          [uuid(id), `member${id}@example.test`, JSON.stringify({ app: 'safika_portfolio', username })]), (error) => error.code === code);
        assert.equal((await rows('SELECT count(*)::integer AS count FROM auth.users WHERE id = $1', [uuid(id)]))[0].count, 0);
      }
    });

    await context.test('anonymous profile read, client profile writes, and private role RPC access are denied', async () => {
      assert.deepEqual((await rows(`SELECT
        has_table_privilege('anon', 'public.portfolio_profiles', 'SELECT') AS anonymous_read,
        has_table_privilege('authenticated', 'public.portfolio_profiles', 'UPDATE') AS client_update,
        has_function_privilege('authenticated', 'portfolio_private.sync_profile(uuid,boolean)', 'EXECUTE') AS client_rpc,
        has_schema_privilege('authenticated', 'portfolio_private', 'USAGE') AS client_private_schema`))[0],
      { anonymous_read: false, client_update: false, client_rpc: false, client_private_schema: false });
      await claim(uuid(3));
      await role('authenticated');
      assert.deepEqual(await rows('SELECT username FROM public.portfolio_profiles'), [{ username: 'member_3' }]);
      await assert.rejects(() => database.exec("UPDATE public.portfolio_profiles SET role = 'super_admin'"), (error) => error.code === '42501');
      await role();
    });

    await query('INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES ($1, $2, now(), $3)',
      [uuid(7), 'viewer@example.test', JSON.stringify({ app: 'safika_portfolio', username: 'viewer_7' })]);
    await database.exec(`
      INSERT INTO public.portfolio_content_records (section, payload, published) VALUES
        ('projects', '{"title":"Published"}', true),
        ('projects', '{"title":"Draft"}', false),
        ('settings', '{}', false);
      INSERT INTO public.portfolio_inquiries (name, email, message) VALUES ('Visitor', 'visitor@example.test', 'Hello');
    `);

    await context.test('anonymous visitors and normal members read only published content', async () => {
      await role('anon');
      assert.equal((await rows('SELECT count(*)::integer AS count FROM public.portfolio_content_records'))[0].count, 1);
      await assert.rejects(() => query('SELECT * FROM public.portfolio_inquiries'), (error) => error.code === '42501');
      await role();
      await claim(uuid(7));
      await role('authenticated');
      assert.equal((await rows('SELECT count(*)::integer AS count FROM public.portfolio_content_records'))[0].count, 1);
      assert.deepEqual(await rows('SELECT * FROM public.portfolio_inquiries'), []);
      await assert.rejects(() => database.exec("INSERT INTO public.portfolio_content_records (section,payload) VALUES ('projects','{}')"), (error) => error.code === '42501');
      await role();
    });

    await context.test('editors can manage content and message status but cannot edit settings or delete', async () => {
      await claim(uuid(3));
      await role('authenticated');
      assert.equal((await rows('SELECT count(*)::integer AS count FROM public.portfolio_content_records'))[0].count, 3);
      await database.exec("INSERT INTO public.portfolio_content_records (section,payload) VALUES ('projects','{}')");
      await assert.rejects(() => database.exec("INSERT INTO public.portfolio_content_records (section,payload) VALUES ('settings','{}')"), (error) => error.code === '42501');
      await assert.rejects(() => database.exec("UPDATE public.portfolio_content_records SET section='settings' WHERE section='projects' AND published=false"), (error) => error.code === '42501');
      assert.equal((await query("UPDATE public.portfolio_content_records SET payload='{}' WHERE section='settings'")).affectedRows, 0);
      assert.equal((await query("DELETE FROM public.portfolio_content_records WHERE section='projects'")).affectedRows, 0);
      assert.equal((await query("UPDATE public.portfolio_inquiries SET status='reviewing'")).affectedRows, 1);
      await assert.rejects(() => database.exec("UPDATE public.portfolio_inquiries SET message='overwritten'"), (error) => error.code === '42501');
      await role();
    });

    await context.test('confirmed owner can manage settings and delete portfolio content', async () => {
      await claim(uuid(2));
      await role('authenticated');
      assert.equal((await query("UPDATE public.portfolio_content_records SET payload='{}' WHERE section='settings'")).affectedRows, 1);
      assert.ok((await query("DELETE FROM public.portfolio_content_records WHERE section='projects' AND published=false")).affectedRows >= 1);
      await role();
    });

    await context.test('login limiter accepts ten attempts, then blocks and saturates at eleven', async () => {
      const hash = 'a'.repeat(64);
      await role('service_role');
      const results = [];
      for (let attempt = 0; attempt < 13; attempt++) {
        results.push((await rows('SELECT public.portfolio_consume_auth_limit($1) AS allowed', [hash]))[0].allowed);
      }
      assert.deepEqual(results, [...Array(10).fill(true), false, false, false]);
      assert.equal((await rows('SELECT attempts FROM public.portfolio_auth_rate_limits WHERE identifier_hash=$1', [hash]))[0].attempts, 11);
      await query("UPDATE public.portfolio_auth_rate_limits SET window_started_at=statement_timestamp()-interval '11 minutes' WHERE identifier_hash=$1", [hash]);
      assert.equal((await rows('SELECT public.portfolio_consume_auth_limit($1) AS allowed', [hash]))[0].allowed, true);
      assert.equal((await rows('SELECT attempts FROM public.portfolio_auth_rate_limits WHERE identifier_hash=$1', [hash]))[0].attempts, 1);
      await assert.rejects(() => query('SELECT public.portfolio_consume_auth_limit($1)', ['invalid']), /Invalid login limit key/);
      await role();
    });

    await context.test('contact limiter allows five stored attempts and denies the sixth', async () => {
      await role('service_role');
      const results = [];
      for (let attempt = 0; attempt < 6; attempt++) {
        results.push((await rows('SELECT public.portfolio_consume_contact_limit($1) AS allowed', ['b'.repeat(64)]))[0].allowed);
      }
      assert.deepEqual(results, [true, true, true, true, true, false]);
      await role();
    });

    await context.test('public clients cannot execute limiter RPCs or read limiter rows', async () => {
      for (const name of ['anon', 'authenticated']) {
        await role(name);
        await assert.rejects(() => query('SELECT public.portfolio_consume_auth_limit($1)', ['c'.repeat(64)]), (error) => error.code === '42501');
        await assert.rejects(() => query('SELECT public.portfolio_consume_contact_limit($1)', ['c'.repeat(64)]), (error) => error.code === '42501');
        await assert.rejects(() => query('SELECT * FROM public.portfolio_auth_rate_limits'), (error) => error.code === '42501');
        await role();
      }
    });

    await context.test('Auth deletion removes only the linked portfolio profile', async () => {
      await query('DELETE FROM auth.users WHERE id=$1', [uuid(3)]);
      assert.equal((await rows('SELECT count(*)::integer AS count FROM public.portfolio_profiles WHERE user_id=$1', [uuid(3)]))[0].count, 0);
      assert.equal((await rows('SELECT role FROM public.profiles WHERE id=$1', [uuid(1)]))[0].role, 'other_app_admin');
      assert.equal((await rows('SELECT full_name FROM public.profiles WHERE id=$1', [uuid(10)]))[0].full_name, 'Updated Customer');
    });
  } finally {
    await database.close();
  }
});
