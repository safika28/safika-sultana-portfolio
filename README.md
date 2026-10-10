# Safika Sultana — Analytics Workspace

A compact, mobile-first portfolio built with Next.js, TypeScript, Tailwind, Lucide, and Recharts. Public projects come from all Safika's public GitHub repositories. The supplied profile, portraits, contact details, and 108 unique listed skills work without a database.

The workspace includes project search and case studies, source-backed portfolio analytics, a skill explorer, professional timelines, three supplied course certificates with PDFs, research notes, contact links, and a secure Supabase CMS. Unpublished history and unavailable model results display honest empty states.

## Run locally

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The optional NestJS API runs separately with `npm run dev --workspace api`.

## Accounts, CMS, and contact storage

Supabase Auth is connected to project `qizcujjcqzekzoneryxp`. Open `/register` to create an account with a unique username, email, and password; `/login` accepts username or email. `/account` shows the protected profile and supports sign-out. Register and verify `safikasultana90@gmail.com` to receive administrator access automatically. No password is created or committed for the owner.

The versioned [project configuration](apps/web/lib/supabase-project.ts) contains only the public project URL and publishable browser key. Deployment environment variables can override them. Server secrets stay outside Git. Follow [authentication setup](docs/auth-setup.md) and [CMS setup](docs/cms-setup.md) for another environment. The Auth redirect allow-list must include this portfolio's `/auth/callback` URL while preserving the existing Site URL. A real resume document is still required to enable CV download.

Open `/admin` after verified administrator sign-in to publish portfolio content. CMS requests use the verified session and database RLS. Optional contact-form storage requires a server-only service key; the form confirms success only after storage succeeds. Direct email and telephone links remain available.

## Validation

```sh
npm run lint
npx tsc --noEmit --incremental false -p apps/web/tsconfig.json
node --test apps/web/test/*.test.cjs
node --test database/test/*.test.cjs
npm test
npm run build
```

GitHub Actions runs these checks on pushes and pull requests. See [the architecture](docs/architecture.md) and [design notes](docs/dashboard-redesign.md).
