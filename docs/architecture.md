# Architecture

The Next.js App Router application in `apps/web` serves the public dashboard and its same-origin contact/admin APIs. The existing optional NestJS API is preserved in `apps/api`; the web app does not require a second hosting service.

## Data

`lib/portfolio-data.ts` merges the owner's supplied profile and skills with cached public GitHub repository metadata and published Supabase content. API outages fall back to a dated repository inventory; missing metadata stays unavailable. Scope categories are editorial labels and do not imply completed work. No visitor traffic or model accuracy is fabricated.

Supabase's `content_records` stores validated drafts and published content by section. Public reads include only published valid records. Legacy tables and rows remain intact. Real metrics include a dataset and methodology. The listed toolkit is not a certification or proficiency score.

## Authorization and messaging

The CMS checks bearer tokens using Supabase Auth and then reads the protected database role on every request. Editors can manage portfolio content and message status; homepage settings require `super_admin`. Clients cannot assign themselves a role. Private drafts and inquiries are protected by RLS. Server-only modules use the service key after request authorization; it is never sent to browsers.

Contact input has length and JSON body limits, validation, a honeypot, and process-local plus atomic database throttling. Only a successful inquiry insertion returns success. Missing configuration or storage failures produce an unavailable response with direct email alternatives.

## Presentation

The shared shell offers desktop sidebar navigation, compact headers, a persistent manual theme, and five mobile bottom destinations with safe-area padding. Charts and explorers are split into client components; profile, CMS data, and credential access remain server-side. Expanded chart views and tables support keyboard users and reduced motion. Content uses safe text rendering.

## Operations

Set up the existing Supabase project using [cms-setup.md](cms-setup.md). The SQL must be reviewed against the actual database before use. GitHub contains no real Supabase configuration or CV. No remote schema was changed during implementation. CI validates frontend types/lint, both security test suites, and production builds without credentials.
