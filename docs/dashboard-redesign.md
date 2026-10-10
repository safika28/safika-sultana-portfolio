# AI analytics portfolio

The portfolio now uses a mobile analytics workspace with Home, Projects, Analytics, Skills and Contact routes. Existing homepage anchors remain available. Secondary pages hold About, Experience, Education, Certifications and Research; `/admin` remains the secure CMS entry point.

## Design tokens

Dark backgrounds: `#080D18`, `#0F172A`, `#111C30`, `#17243B`. Cyan `#22D3EE`, blue `#3B82F6`, violet `#A78BFA`; text `#F8FAFC` / `#94A3B8`; border `#25344C`. A manual light theme uses the same hierarchy with white panels and darker accents. Typography uses Inter and JetBrains Mono. Panels have 12px corners and restrained borders.

Mobile starts at 320px with 12–16px gutters, 12–14px panel padding, 44px controls and two-column overview statistics. At 768px content gains two columns; at 1024px a compact sidebar replaces bottom navigation and the project grid expands. Bottom navigation reserves safe-area space and hides while an on-screen keyboard occupies the viewport.

## Data and integrity

GitHub data is fetched server-side with caching, timeouts, metadata validation and a last verified repository fallback. Repository scope labels describe topics; they do not imply completed models, trained accuracy or business outcomes. Empty/unavailable metadata is explicit. Owner-supplied skills remain available without made-up proficiency percentages.

Published CMS records override profile, skills, case studies, credentials, notes and theme settings. Unconfigured CMS values remain unavailable, rather than substituting fictional metrics. Existing sample experience remains in source for migration, but is not published as verified employment history. No fabricated models or predictions are shown.

Contact messages are accepted only after validation, anti-spam checks and confirmed server storage. CMS mutations require a validated identity and a database-backed administrator/editor role. Supabase setup and credential prerequisites are documented separately. Credentials never belong in Git or public bundles.

## Verification

Check mobile widths 320, 360, 390, 430; tablet 768; desktop 1024 and 1440. Verify route/history behavior, search/filter URL state, keyboard tabs, chart expansion and text alternatives, contact rejection/success paths, administrator authorization, dark/light contrast and document overflow. Run frontend lint/type checking, production build and backend automated tests.
