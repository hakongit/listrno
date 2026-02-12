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
- `/admin` - Admin login
- `/admin/dashboard` - Admin dashboard for email import, LLM extraction, editing

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
- POP3 fetch now merges with existing DB-imported emails instead of replacing them
- Separate "nye på server" badge shows POP3 server count; "totalt" badge shows all known emails
- Cache preserves real totalOnServer from POP3 LIST command
- Normal POP3 mode: first fetch gets all available emails, subsequent fetches get only new ones
- Editable extraction results form in admin dashboard (edit company, bank, recommendation, target price, analysts, summary)
- LLM feedback loop: re-process reports with one-time feedback, persistent guidance prompt for all extractions
- Fixed "Behandle" on already-imported emails (was returning 409, now uses reprocess endpoint)
- Fixed `unstable_cache` missing `tags` option so `revalidateTag` actually invalidates public page cache
- Fetch all POP3 emails (maxResults=500 instead of 20), newest first
- `/analyser` page hides reports with no extracted data, hides empty cells

### Known state
- 431 reports imported in DB, 5 whitelisted domains configured
- 13 reports processed, 418 pending
- Gmail POP3 must be set to "Enable POP for all mail" in Gmail settings to expose all historical emails
- Next step: process imported reports via "Behandle" to populate /analyser page
