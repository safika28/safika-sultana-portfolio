# Secure CMS and messaging setup

The public site works with the owner's supplied profile and skills plus verified public GitHub repositories. Supabase supplies published case studies, experience, education, certifications, research notes, configuration, and contact message storage. Unconfigured services display honest empty or unavailable states; a contact request is confirmed only after insertion succeeds.

1. In an existing Supabase project, review and run `database/schema.sql` in the SQL editor. It preserves existing rows, replaces the original unsafe profile policy, and creates the content and rate-limit tables. Back up a production database before applying schema changes. Review any additional pre-existing policies independently.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) in the web server environment. The service key stays server-only. Use a separate random `CONTACT_RATE_LIMIT_SECRET`. Configure the same private URL/key/limiter secret for the optional Nest API.
3. Create/invite the owner in Supabase Auth. Link the verified Auth user ID to an administrator profile using the SQL below. Role assignment is intentionally unavailable to public clients and CMS editors.
4. Open `/admin`, sign in, and add content using the section templates. Save drafts before publishing. Profile records can include `cvUrl` pointing to the real resume and `photoUrl`. Keep `phoneNumber` and its `tel:` `phoneHref` in sync when editing contact details. Project records support documented case-study text, metrics with dataset and methodology, and visualizations. Settings require `super_admin`. Public pages read only published, schema-valid records; no HTML from the editor is executed.
5. Test an approved editor, a regular account, expired credentials, and a logged-out visitor. Verify that published rows are public, draft rows/inquiries are private, and role promotion through the Data API fails. Supabase Auth should use secure password policies and appropriate MFA for the administrator.
6. Test one real inquiry and check it appears in `/admin`. The process-local limit adds protection, while the SQL RPC atomically enforces five requests per 10-minute bucket across server instances. If the database/RPC is unavailable, requests fail closed. `TRUST_PROXY=true` is appropriate only behind a proxy that overwrites client IP headers; Vercel's edge is detected automatically. Otherwise all local requests share a conservative bucket. The optional Nest API applies an additional global request limit.

```sql
-- Replace these placeholders with the actual invited user's UUID and email.
insert into public.profiles (email, full_name, user_id, role)
values ('OWNER_EMAIL', 'Safika Sultana', 'AUTH_USER_UUID', 'super_admin')
on conflict (email) do update set user_id = excluded.user_id, role = excluded.role;
```

Existing sample experience has not been inserted into the CMS. Existing legacy `projects` and `blog_posts` tables are preserved; the new editor manages `content_records`. Migrate only verified legacy content after reviewing it. The JSON fields are validated server-side; admin operations validate the bearer token with `auth.getUser` and look up the database role on every request.

Run database security advisors after installation. The SQL uses no security-definer function and does not expose the service-only rate limiter to the public. New tables may require Data API exposure in the Supabase dashboard. Messages are not emailed by this implementation; they are stored securely for administrator review. Establish a retention policy for inquiry data before production use.

Automated checks: `node --test apps/web/test/security.test.cjs` exercises the actual Next server validators/routes against a mocked database boundary, including authorization, published-only reads, malicious payloads, failed inserts, and rate-limit failures. `npm test` runs the Nest validation and storage tests. `.github/workflows/ci.yml` runs lint, type checks, both suites, and production builds without credentials. These checks do not replace the real database/RLS verification in step 5.
