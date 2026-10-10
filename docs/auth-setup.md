# Portfolio registration and sign-in

The portfolio uses Supabase Auth for email/password registration, email verification, sign-in, and sign-out. Each portfolio account has a protected row in `public.portfolio_profiles`; usernames are unique, lowercase, and contain 3–30 letters, numbers, or underscores. `safika_owner` is reserved for the owner. Passwords remain in Supabase Auth and are never stored in portfolio tables.

## Install the database setup

The connected project is `qizcujjcqzekzoneryxp`. Review and apply `database/schema.sql`, `database/auth.sql`, and `database/auth-rate-limit.sql` for another installation. Portfolio tables use the `portfolio_` prefix. This connected project also applies `database/shared-auth.sql` to isolate portfolio registration from its phone-required customer trigger. It preserves the existing trigger definition and customer sync while inserting a reviewed, fingerprint-checked portfolio guard.

Registration must send `options.data: { app: 'safika_portfolio', username, full_name: username }`. The discriminator creates portfolio membership only; it never grants editing rights. Accounts belonging to another application remain untouched unless they already have a portfolio profile or use the owner email. Installation backfills only existing portfolio memberships, accounts with that discriminator, and the verified owner.

Configure the public project URL and publishable/anon key in the web environment. CMS uses the public key with the verified user token and RLS; an optional server service key stays server-only. Deploy `database/functions/portfolio-auth/index.ts` as `portfolio-auth` with JWT verification disabled because it verifies the submitted password itself and login callers have no session yet. The function holds its automatically injected secret key, checks a confirmed identity and protected portfolio membership, and never returns that secret. The deployed function is active in this project. On a shared project, preserve its existing Auth Site URL, email-confirmation settings, SMTP configuration, and redirect URLs. Add `http://localhost:3000/auth/callback` and the real production site's `/auth/callback` URL to the Auth redirect allow-list. Registration explicitly passes `window.location.origin + '/auth/callback'` through `emailRedirectTo`; the browser callback completes the session and opens the account page. Verify the production domain exists before configuring it. Keep email verification enabled; confirmation must establish ownership of the email before an account can administer the site.

## Owner administrator access

Register or sign in with `safikasultana90@gmail.com` and complete Supabase email verification. The trusted Auth trigger grants `super_admin` only when the actual `auth.users.email` matches that address, case-insensitively, and `email_confirmed_at` is present. It never trusts a submitted role, username, `user_metadata`, or JWT role claim. An existing verified owner is promoted during installation without changing the password or sending a reset email.

The protected `owner_admin_granted` flag tracks automatic owner grants. Changing that account's email or removing its verification revokes the automatic administrator role. Explicit editor/admin roles on other portfolio accounts remain intact. Later changes to user metadata cannot change an existing profile's username. Unlinked legacy profile rows remain unlinked; the setup deliberately does not assign an Auth identity by matching an unverified email. A conflicting legacy email or username requires operator review rather than taking over another account.

The trigger and helper run in the unexposed `portfolio_private` schema with an empty search path and fully qualified table names. Neither visitors, authenticated clients, nor the application service role can execute them directly. Supabase Auth invokes the trigger internally. Public clients have only own-profile SELECT access; profile creation and role writes are restricted to trusted database code or the project operator. Never expose `portfolio_private` through the Data API.

## Verification

Run Supabase security advisors after setup. Check the installed trigger, table privileges, RLS policies, and role using the queries below; they expose no passwords, API keys, or session tokens.

```sql
select trigger_name, event_manipulation
from information_schema.triggers
where event_object_schema = 'auth' and event_object_table = 'users'
  and trigger_name = 'portfolio_sync_auth_profile';

select username, role, owner_admin_granted
from public.portfolio_profiles
where user_id in (
  select id from auth.users
  where lower(email) = 'safikasultana90@gmail.com' and email_confirmed_at is not null
);

select has_table_privilege('anon', 'public.portfolio_profiles', 'SELECT') as anonymous_read,
  has_table_privilege('authenticated', 'public.portfolio_profiles', 'UPDATE') as client_update,
  has_function_privilege('authenticated', 'portfolio_private.sync_profile(uuid,boolean)', 'EXECUTE') as client_role_assignment;
-- All three values must be false.

select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'portfolio_profiles';
-- Only own-profile SELECT should be available to authenticated accounts.
```

Test a new non-owner registration, duplicate username rejection, confirmation, sign-in, sign-out, and rejected administrator access for a normal account. Also test that submitted `role: 'super_admin'` metadata does not change the profile role and that later metadata edits do not change the username. Use isolated test identities or a development project for email-change/unverification tests; verify that only the confirmed owner is automatically promoted and the grant is revoked after an owner email change. Auth trigger failures can block signups, so inspect Supabase Auth logs if registration returns a database error. Application tests cover validation and API authorization, but actual database privilege and confirmation checks must be verified against the configured project.

`database/test/auth-schema.test.cjs` executes all three setup files against an isolated PostgreSQL runtime. It checks shared-project isolation, idempotency, owner promotion and revocation, metadata tampering, username rejection, table/function privileges, own-profile RLS, editor/admin CMS boundaries, and both rate-limit functions. The test-only PostgreSQL runtime is pinned in root devDependencies. Run `npm ci`, then `node --test database/test/*.test.cjs`.

The suite supplies a minimal Supabase Auth fixture and checks the actual setup SQL without modifying the production project. It does not emulate Supabase email delivery or distributed connection concurrency; real Auth confirmation and deployed integration still require verification.

The implementation follows Supabase's [user management](https://supabase.com/docs/guides/auth/managing-user-data), [function security](https://supabase.com/docs/guides/database/functions#secure-a-database-function), and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) guidance.
