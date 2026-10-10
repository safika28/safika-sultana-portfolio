# Deployment

The web application uses same-origin Next.js route handlers for CMS and contact. No separate API host is required. The optional existing NestJS API remains available when needed.

## Existing Vercel project

Use repository `safika28/safika-sultana-portfolio` and set the Vercel root directory to `apps/web`. Install monorepo dependencies with `npm ci` from the repository root. Build the web workspace using `npm run build --workspace web`; Next.js handles its output directory.

GitHub Actions validates changes. Publication depends on the existing Vercel project's Git integration and production branch. A GitHub push alone is not proof of a successful deployment.

## Supabase

Use the owner's intended existing Supabase project. Review `database/schema.sql` before applying it; follow [cms-setup.md](cms-setup.md) for administrator provisioning and RLS verification.

Set these web environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `CONTACT_RATE_LIMIT_SECRET` (server-only random secret)

Keep real secrets out of Git. The repository contains examples only. Add a genuine CV URL in a published profile to enable downloads. Before database configuration, GitHub/profile/skills content remains available, admin shows setup instructions, and messaging reports unavailable rather than confirming delivery.

## Optional NestJS API

Build with `npm run build --workspace api` and start with `npm run start --workspace api`. Supply private Supabase values and a `CORS_ORIGINS` allowlist. Enable `TRUST_PROXY` only behind a proxy that replaces client IP headers.

## Production verification

Run the README checks. After deployment, verify public routes, both themes, mobile navigation, filtering, a real administrator session, and a stored contact message. Audit RLS against the actual project. Lighthouse targets require browser measurements; no score is claimed from static checks.
