# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Listr.no is a Norwegian short positions tracker. It fetches data from Finanstilsynet's public API and presents it in an accessible format to retail and professional traders.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (free tier)
- **Data Source**: Finanstilsynet API (https://ssr.finanstilsynet.no/api/v2/instruments/export-json)

## Development Commands

```bash
npm install     # Install dependencies
npm run dev     # Start dev server (http://localhost:3000)
npm run build   # Production build
npm run lint    # Run ESLint
```

## Architecture

```
app/
  layout.tsx      - Root layout with header/footer
  page.tsx        - Dashboard (all companies with short positions)
  [ticker]/       - Dynamic company detail pages
    page.tsx
  om/             - About page
    page.tsx

lib/
  data.ts         - Data fetching from Finanstilsynet
  types.ts        - TypeScript interfaces
  utils.ts        - Utility functions (formatting, etc.)
```

## Data Flow

1. Finanstilsynet API returns raw instrument data with events
2. `lib/data.ts` parses this into a cleaner structure
3. Pages use Next.js caching (1 hour revalidation)
4. Company pages are statically generated at build time

## Branding

- Subtle "Bluecap" branding in footer only
- Clean, minimal design
- Norwegian language (nb)

## Future Expansion

This project is designed to later include:
- Historical position tracking
- Email alerts for position changes
- User accounts
- API access for developers
- Integration with company fundamentals/news
