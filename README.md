# Safika Sultana — Analytics Workspace

A compact, mobile-first portfolio built with Next.js, TypeScript, Tailwind, Lucide, and Recharts. Public projects come from all Safika's public GitHub repositories. The supplied profile, portraits, contact details, and 108 unique listed skills work without a database.

The workspace includes project search and case studies, source-backed portfolio analytics, a skill explorer, professional timelines, three supplied course certificates with PDFs, research notes, contact links, and a secure Supabase CMS. Unpublished history and unavailable model results display honest empty states.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The optional NestJS API runs separately with `npm run dev --workspace api`.

## CMS and contact storage

Follow [the setup guide](docs/cms-setup.md) to apply the reviewed schema, configure Supabase environment variables, and assign the owner a database-backed administrator role. Put web environment variables in `apps/web/.env.local`, or your deployment provider. Keep service keys server-only. GitHub currently contains placeholder Supabase settings and no resume document.

Open `/admin` to publish profile changes, a real CV link, skills, projects and documented metrics, experience, education, certifications, research notes, and homepage settings. The contact form confirms success only after the database stores a message; direct email and telephone links work before configuration.

## Validation

```sh
npm run lint
npx tsc --noEmit --incremental false -p apps/web/tsconfig.json
node --test apps/web/test/*.test.cjs
npm test
npm run build
```

GitHub Actions runs these checks on pushes and pull requests. See [the architecture](docs/architecture.md) and [design notes](docs/dashboard-redesign.md).
