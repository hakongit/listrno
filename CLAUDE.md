# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Listr.no is a Norwegian financial data tracker that aggregates:
1. **Short positions** - from Finanstilsynet's public API
2. **Insider trades** - from Euronext Oslo press releases

The site presents this data to retail and professional traders with historical charts, company profiles, and insider profiles.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Turso (libSQL)
- **Hosting**: Vercel
- **Data Sources**:
  - Finanstilsynet API (short positions)
  - Euronext Oslo (insider trades)
  - Yahoo Finance v8 API (stock prices, 52-week range, volume)

## Development Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Sync data + build (requires DB credentials)
npm run lint             # ESLint
npm run db:sync          # Sync short positions from Finanstilsynet
npm run db:sync-insider  # Sync insider trades from Euronext
```

For local development with database, create `.env.local`:
```
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

## Architecture

### Data Layer (`lib/`)
- `db.ts` - Turso database client and schema initialization
- `data-db.ts` - Short positions queries with stock price enrichment
- `insider-data-db.ts` - Insider trades queries
- `analyst-db.ts` - Analyst reports DB: CRUD, domain whitelist, extraction guidance
- `analyst-extraction.ts` - LLM extraction via OpenRouter (accepts guidance/feedback)
- `analyst-types.ts` - Types: `AnalystReport`, `ExtractedReportData`, `PublicAnalystReport`
- `gmail.ts` - Gmail POP3 fetcher with progress streaming and 5-min cache
- `pdf-extract.ts` - PDF text extraction for email attachments
- `prices.ts` - Yahoo Finance API for stock quotes (price, volume, 52-week range)
- `tickers.ts` - ISIN/company name to Yahoo Finance ticker mapping
- `insider-profiles.ts` - Manual profile data (Twitter handles, bios)
- `types.ts` - Core types: `CompanyShortData`, `ShortPosition`, `PositionHolder`
- `insider-types.ts` - Types: `InsiderTrade`, `InsiderSummary`

### Pages (`app/`)
- `/` - Dashboard with all companies sorted by short %
- `/[ticker]` - Company detail (supports both short positions and insider-only companies)
- `/aktor/[slug]` - Short position holder profile
- `/innsidehandel` - Insider trades overview
- `/innsidehandel/[slug]` - Individual insider profile with trades
- `/topp/[kategori]` - Top lists (biggest shorts, most shorted, etc.)
- `/analyser` - Public analyst reports page (only shows reports with extracted data)
- `/analyser/bank/[slug]` - Bank profile with all reports from that bank
- `/analyser/selskap/[slug]` - Company profile with all analyst reports for that company
- `/analystatwork` - Admin login
- `/analystatwork/dashboard` - Admin dashboard for email import, LLM extraction, editing

### Admin API (`app/api/admin/`)
- `reports/` - CRUD for analyst reports (import, process, update, delete)
- `gmail/emails/` - SSE streaming POP3 email fetch with auto-import
- `domains/` - Domain whitelist management
- `extraction/reprocess/` - Re-run LLM extraction with feedback on existing report
- `extraction/guidance/` - GET/PATCH persistent LLM guidance prompt

### Data Sync Scripts (`scripts/`)
- `sync-data.ts` - Fetches from Finanstilsynet, updates positions table
- `sync-insider-data.ts` - Scrapes Euronext PDFs, extracts trade details

## Data Flow

1. **Build time**: Scripts sync data from APIs → Turso database
2. **Request time**: Pages query database with `unstable_cache` (5 min TTL, tags for revalidation)
3. **Stock enrichment**: Yahoo Finance prices fetched and merged with company data
4. **Company pages**: Fall back to insider-only view if no short positions exist

### Analyst Reports Flow
1. Admin fetches emails via POP3 (Gmail) → SSE stream to dashboard
2. Whitelisted domain emails are auto-imported (email body + PDF text stored in DB)
3. "Behandle" runs LLM extraction (OpenRouter) with global guidance prompt
4. Admin can edit extracted fields, save, or re-process with specific feedback
5. `revalidateTag("public-analyst-reports")` busts the public page cache
6. `/analyser` only shows reports with actual extracted data (companyName/recommendation/targetPrice)

## Key Patterns

- Company URLs use slugified issuer names (e.g., `/hexagon-composites`)
- Ticker symbols are Yahoo Finance format (`HEX.OL` for Oslo Børs)
- Currency is primarily NOK; insider trades may have other currencies
- Mobile-first responsive design with Tailwind breakpoints
- Dates on `/analyser` pages use `DD.MM` format (e.g., `12.02`) via `formatDateShort()` — never month names

## Site-wide Dark Theme

The entire site uses a premium navy-dark design with gold accent:
- **Dark mode**: `class="dark"` on `<html>` activates Tailwind `dark:` variants; `darkMode: "class"` in `tailwind.config.ts`
- **CSS variables**: `--an-*` custom properties on `:root` in `globals.css` (navy palette, gold accent, muted rec colors)
- **Tailwind overrides**: CSS rules at the end of `globals.css` remap all Tailwind `dark:` utilities (backgrounds, text, borders, hover, colored accents) to `--an-*` values — this ensures all pages use the navy palette without editing individual files
- **Fonts**: Inter (`--font-inter`) and JetBrains Mono (`--font-mono`) loaded in root layout via `next/font/google`
- **Navigation**: `components/site-nav.tsx` (client component) with `usePathname()` for active state, pill-style hover via `.nav-link` CSS; logo uses CSS variables for colors
- **Layout**: Root `app/layout.tsx` provides gold accent line (`.an-top-accent`), `<SiteNav />`, main content, and themed footer
- **Key classes**: `.an-top-accent` (gold gradient), `.an-stat-accent` (gold-tinted card), `.rec-bar-track`/`.rec-bar-fill` (recommendation bars), `.an-table-row` (hover effect), `.mono` (JetBrains Mono)

## Key DB Tables (Analyst)

- `analyst_reports` - Imported emails with extracted data, source content stored for re-processing
- `analyst_domains` - Whitelisted sender domains (auto-import)
- `extraction_guidance` - Single-row table for persistent LLM instructions

## Language

All user-facing text is in Norwegian (nb). Key terms:
- Shortposisjoner = Short positions
- Innsidehandel = Insider trading
- Aktør = Actor/holder
- Selskap = Company
- Kjøp/Salg = Buy/Sell
- Analytikerrapporter = Analyst reports
- Behandle = Process
- Godkjente domener = Approved domains

## Session Status (2026-02-12)

### Recently completed
- Made everything clickable on `/analyser` pages: all company names link to `/{slug}` (if short data) or `/analyser/selskap/{slug}` (new page); bank names visible + clickable on mobile; bank hover styles added
- Created `/analyser/selskap/[slug]` company profile page — shows all analyst reports for a company with breadcrumb, stats grid, and link to short positions page if available
- Created `/analyser/bank/[slug]` bank profile page — breadcrumb navigation added
- Added `getCachedPublicAnalystReportsByCompany`, `getCachedAnalystCompanies` to `analyst-db.ts`
- Changed `companyName` filter in `getPublicAnalystReports` from `LIKE` to exact `=` match
- Tailwind dark: overrides in `globals.css` remap all gray/colored utilities to navy palette — full visual consistency across every page
- Site-wide premium navy-dark design with gold accent, Inter + JetBrains Mono fonts
- Client-side `<SiteNav />` component with `usePathname()` active state and pill-style hover
- All page inline headers removed — nav, accent line, and footer now in root layout
- Dashboard stats grid (4 cards), recommendation bars (Kjøp/Hold/Selg), bank leaderboard on `/analyser`
- `formatDateShort()` for `DD.MM` date format on analyser pages
- Batch pre-loading for analyst report review: pre-loads 5 reports ahead for instant "Godkjenn og neste"
- Bar chart favicon (`app/icon.svg`) and reusable `<Logo />` component (`components/logo.tsx`)
- Branding: Bluebox AS (blueboxas.no) in footer and /om page
- Fixed insider sync: Euronext broke `?page=N` pagination (301 redirects), now fetches base URL
- Admin pages moved from `/admin` to `/analystatwork`
- POP3 fetch merges with existing DB-imported emails; separate server/total counts
- Editable extraction results form in admin dashboard
- LLM feedback loop: re-process reports with one-time feedback, persistent guidance prompt
- `/analyser` page hides reports with no extracted data

- **Company page (`/[ticker]`) revamp** — full redesign with navy-dark theme:
  - Hero: prominent h1 company name, ticker badge, stock price, ISIN
  - Stats grid (4 cards): total short %, stock price + 52-week, insider activity, analyst consensus
  - Short position history chart restyled with `--an-*` CSS vars
  - Two-column grid (desktop) / stacked (mobile): positions table (left 3/5) + analyst reports + insider trades + company info (right 2/5)
  - Insider-only fallback with same layout minus short-specific sections
  - All entities clickable with gold hover, `RecommendationBadge`, `an-stat-accent`, `an-table-row` patterns
  - Removed all old gray Tailwind classes, uses CSS variables directly via `style={}` props
  - Dates use `formatDateShort()` (DD.MM format) in compact panels

### Known state
- 431 reports imported in DB, 5 whitelisted domains configured
- Gmail POP3 must be set to "Enable POP for all mail" in Gmail settings to expose all historical emails

### Clickability audit (2026-02-12)
All core entities are properly clickable across every page:
- Company names → `/{slug}` or `/analyser/selskap/{slug}` (100%)
- Actor/holder names → `/aktor/{slug}` (100%)
- Insider names → `/innsidehandel/{slug}` (100%)
- Bank names → `/analyser/bank/{slug}` (100%)
- Breadcrumbs present on all nested pages
- External source links open in new tabs
- No missing navigation paths found

### Design consistency audit (2026-02-12)
All pages now use navy CSS vars (`--an-*`) via `style={}` props:

- `/page.tsx` (dashboard) — full navy redesign ✓
- `/[ticker]/page.tsx` — full navy redesign ✓ (headers improved: "Short-historikk", "Aktive shortposisjoner", "Siste innsidehandler")
- `/aktor/[slug]/page.tsx` — full navy redesign ✓ (breadcrumb, stats grid, descriptive headers)
- `/innsidehandel/page.tsx` — full navy redesign ✓
- `/innsidehandel/[slug]/page.tsx` — full navy redesign ✓ (breadcrumb, company pills, trades table)
- `/topp/[kategori]/page.tsx` — full navy redesign ✓ (gold accent period filter, breadcrumb)
- `/analyser/page.tsx` — full navy redesign ✓
- `/analyser/bank/[slug]/page.tsx` — full navy redesign ✓
- `/analyser/selskap/[slug]/page.tsx` — full navy redesign ✓
- `components/insider-table.tsx` — navy redesign ✓ (removed lucide icons, CSS var badges)
- `components/searchable-table.tsx` — navy redesign ✓ (inline SVG search icon, CSS var styling)

### Mobile responsive fixes (2026-02-12)
All pages optimized for iPhone-class screens (~393px):
- **Nav**: Shortened labels on mobile (Short/Innside/Analyse/Om), `overflow-x-auto no-scrollbar`, `shrink-0` on logo
- **Page containers**: `px-4 sm:px-6` everywhere (was `px-6`)
- **Stat cards**: `p-3 sm:p-4`, numbers `text-[20px] sm:text-[26px]`
- **Table cells**: `px-3 sm:px-[18px]` everywhere (was `px-[18px]`)
- **Company/holder names**: `truncate` with `max-w-[120px]-[160px] sm:max-w-none` on mobile
- **Hero sections**: ISIN hidden on mobile (`hidden sm:inline`), reduced gaps and font sizes
- **Footer**: responsive padding
- CSS utility `.no-scrollbar` added to `globals.css`

### Completed: Full site navy redesign
All pages and shared components now use `--an-*` CSS variables via `style={}` props. No pages remain on old gray Tailwind styling. Lucide icons removed from redesigned components in favor of CSS-based styling and inline SVGs.

### Completed: Consistency pass + shared component extraction (2026-02-12)

Extracted 4 shared UI components and ensured navy theme everywhere:

**Shared components (`components/ui/`):**
- `trade-type-badge.tsx` — Kjøp/Salg/Annet badge (was duplicated 4×)
- `recommendation-badge.tsx` — Buy/Hold/Sell analyst badge (was duplicated 4×)
- `change-indicator.tsx` — Short % change with arrow + date (was duplicated 2× with old Tailwind)
- `period-selector.tsx` — Chart period buttons with gold accent active state (was duplicated 2×)

**Chart components restyled:**
- `short-history-chart.tsx` — COLORS const matching CSS vars, PeriodSelector, navy tooltips
- `holder-history-chart.tsx` — CHART_THEME/LINE_COLORS for dark backgrounds, PeriodSelector, navy tooltips
- `lazy-short-chart.tsx` / `lazy-holder-chart.tsx` — loading state uses CSS vars

**Pages restyled:**
- `shortoversikt/page.tsx` — full navy redesign with HighlightCard component, removed lucide icons
- `short-table.tsx` — full navy redesign with ChangeIndicator, removed local format functions
- `page.tsx` — added SEO metadata (Metadata export)

**All duplicated components replaced** — single source of truth for each UI pattern
