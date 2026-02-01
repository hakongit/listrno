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

### Data Sync Scripts (`scripts/`)
- `sync-data.ts` - Fetches from Finanstilsynet, updates positions table
- `sync-insider-data.ts` - Scrapes Euronext PDFs, extracts trade details

## Data Flow

1. **Build time**: Scripts sync data from APIs → Turso database
2. **Request time**: Pages query database with `unstable_cache` (5 min TTL)
3. **Stock enrichment**: Yahoo Finance prices fetched and merged with company data
4. **Company pages**: Fall back to insider-only view if no short positions exist

## Key Patterns

- Company URLs use slugified issuer names (e.g., `/hexagon-composites`)
- Ticker symbols are Yahoo Finance format (`HEX.OL` for Oslo Børs)
- Currency is primarily NOK; insider trades may have other currencies
- Mobile-first responsive design with Tailwind breakpoints

## Language

All user-facing text is in Norwegian (nb). Key terms:
- Shortposisjoner = Short positions
- Innsidehandel = Insider trading
- Aktør = Actor/holder
- Selskap = Company
- Kjøp/Salg = Buy/Sell
