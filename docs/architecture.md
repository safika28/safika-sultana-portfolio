# Architecture overview

This project is designed as a monorepo combining a public Next.js portfolio site with a NestJS backend and a Supabase/PostgreSQL data layer.

## Domain boundaries

- `apps/web`: public marketing site, SEO pages, admin shell, and secure auth-aware client behavior.
- `apps/api`: business API for portfolio, contact, blog, and analytics operations.
- `database`: SQL schema and migration examples for PostgreSQL and Supabase RLS.

## Security considerations

- Keep Supabase service-role keys on the backend only.
- Validate JWTs on every authenticated request using Supabase issuer settings.
- Check database-backed administrative roles before allowing privileged actions.
- Restrict administrative mutations to super_admin roles.
