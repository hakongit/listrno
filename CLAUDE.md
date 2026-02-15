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
npm run db:bulk-import   # Bulk import emails via IMAP (resumes from checkpoint)
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
- `imap.ts` - IMAP client (imapflow) for Gmail: connect, mailbox state, UID-based fetch
- `email-processor.ts` - Shared email processing pipeline: dedup, PDF extraction, LLM extraction, previous rec enrichment, retry logic
- `prices.ts` - Yahoo Finance API for stock quotes (price, volume, 52-week range) and ticker search
- `tickers.ts` - ISIN/company name to Yahoo Finance ticker mapping with async auto-resolve via DB + Yahoo search
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

### Cron Routes (`app/api/cron/`)
- `sync-emails/` - Hourly IMAP sync: fetches new emails since last UID checkpoint, processes them, revalidates cache. Authenticated via `CRON_SECRET` bearer token. Configured in `vercel.json`.

### Data Sync Scripts (`scripts/`)
- `sync-data.ts` - Fetches from Finanstilsynet, updates positions table
- `sync-insider-data.ts` - Scrapes Euronext PDFs, extracts trade details
- `bulk-import.ts` - IMAP-based bulk email import with checkpointing (run locally with `npm run db:bulk-import`)

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
- Ticker symbols are Yahoo Finance format (`HEX.OL` for Oslo Børs); resolved via `resolveTicker()` (hardcoded → DB → Yahoo search → cache)
- Currency is primarily NOK; insider trades may have other currencies
- Mobile-first responsive design with Tailwind breakpoints
- Dates on `/analyser` pages use `DD.MM.YY` format (e.g., `12.02.26`) via `formatDateShort()` — never month names

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
- `analyst_recommendations` - Per-company recommendations (1:N with analyst_reports). Includes `investment_bank` (per-rec bank for aggregator emails like Børsextra), `previous_target_price`, `previous_recommendation`
- `analyst_domains` - Whitelisted sender domains (auto-import)
- `extraction_guidance` - Single-row table for persistent LLM instructions
- `sync_state` - Key-value store for IMAP sync checkpointing (`imap_last_uid`, `imap_uid_validity`, `last_sync_at`)
- `ticker_mappings` - ISIN→ticker cache (auto-populated from hardcoded maps + Yahoo Finance search). Columns: `isin` (PK), `ticker`, `company_name`, `source` ('hardcoded'|'yahoo-search'), `created_at`

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

## Workflow

- When user says "save" or "exit" or "save and quit": always update this Session Status section with current progress, pending tasks, and blockers before stopping
- Save ongoing/new tasks to this file automatically

## Session Status (2026-02-15)

### Recent commits (this session)
- **`1b38e8c`** — Add auto-resolve ISIN → Yahoo Finance ticker via DB cache (`ticker_mappings` table, `resolveTicker()`, `searchTicker()`)
- **`dcc9ece`** — Redesign analyst company page to match main company page layout (ticker, stock price, ISIN, 4-col stats grid with consensus)
- **`f22c018`** — Fix ~20 wrong ISIN-to-ticker mappings + add monthly sentiment trend to `getAnalystStats()`
- **`7fa6ff6`** — Move Selskapsinfo to hero section next to company name (both short-positions and insider-only views)
- (pending commit) — Fix Euronext pagination via Drupal AJAX endpoint + expand bank name map

### Pending tasks
- Run `npm run db:sync-insider -- --full --with-pdfs` to backfill historical insider trades using fixed pagination
- `BANK_NAME_MAP` may still need additions as new bank variants appear in data (now covers ~20 banks)
- Untracked files: `mockup-analyser.html`, `scripts/test-stats.ts` — decide whether to commit or delete

### Recently completed
- Auto-resolve ISIN→ticker via DB: `resolveTicker()` chains hardcoded maps → `ticker_mappings` DB table → Yahoo Finance search API → caches result. New companies no longer need manual code changes for stock prices.
- Analyst company page (`/analyser/selskap/[slug]`) redesigned: ticker badge, live stock price, ISIN, 52-week range, buy/hold/sell consensus in stats grid
- Fixed ISIN-to-ticker mappings (~20 corrections in `tickers.ts` and `analyst-db.ts` knownCompanies)
- Monthly sentiment trend added to `getAnalystStats()` (buy/hold/sell counts by month, last 6 months)
- Selskapsinfo moved from sidebar to hero section on company pages
- Euronext pagination fixed: uses Drupal AJAX endpoint (`/en/views/ajax`) instead of broken `?page=N` HTML pagination. Supports `--full` flag for backfill (up to 50 pages)
- Bank name map expanded: added ABG Sundal Collier, Nordea, Swedbank, SEB, Kepler Cheuvreux, Handelsbanken, Carnegie, Norne Securities + variants

### Known state
- ~2651 analyst reports in DB, 5 whitelisted domains configured
- 185 insider trades in DB, range 2026-01-01 to 2026-02-13 (backfill pending)
- Gmail IMAP enabled for bulk import and cron sync
- Vercel cron: daily at 6 AM UTC (`0 6 * * *`), requires `CRON_SECRET` env var
- `imapflow` added as dependency for IMAP support
- `ticker_mappings` table auto-bootstraps from hardcoded maps on first use
