# ON Portfolio — Claude Code Instructions

## Project Overview
Next.js 16 app for Argentine corporate bond (Obligaciones Negociables) portfolio management. Target users: independent financial advisors in Argentina.

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL (Neon serverless) via Prisma ORM. SQLite for local dev.
- **UI:** Tailwind CSS 4, no component library
- **Charts:** Recharts
- **Scraping:** Cheerio
- **Export:** xlsx (SheetJS)
- **Deploy:** Vercel (auto-deploy from main branch)

## Architecture
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React client components (tabs, charts)
- `src/hooks/` — Custom React hooks (useBonds, usePositions)
- `src/lib/` — Pure utility functions (financial calculations, formatters, prisma client)
- `src/types/` — TypeScript interfaces and DTOs
- `prisma/` — Schema and seed files

## Key Patterns
- **API Routes:** `/api/bonds`, `/api/positions`, `/api/quotes`, `/api/export`, `/api/positions/clear`, `/api/import`
- **Data Flow:** Hooks fetch from API routes → API routes use Prisma → Prisma talks to DB
- **Financial Calcs:** All in `src/lib/financial.ts` — XIRR via Newton-Raphson with bisection fallback, Actual/365 day count
- **Scraping:** IOL + Bolsar as data sources, auto-sync creates missing bonds

## Coding Standards (from prepapp)
### SOLID Principles
- **SRP:** One responsibility per file/function. API routes only handle HTTP. Business logic in lib/.
- **OCP:** New data sources added without modifying existing scrapers.
- **DIP:** Components depend on DTOs (types/index.ts), not Prisma models directly.

### Clean Code
- Names reveal intent: `generateBondCashFlows()` not `getData()`
- Early returns, no deep nesting
- Functions < 20 lines ideally
- Comments explain "why", not "what"
- No magic numbers — use constants

### KISS & DRY
- Simplest solution first
- Reuse: formatters.ts centralizes all formatting
- financial.ts is the single source of truth for calculations

## Database
- **Provider:** PostgreSQL (prod), SQLite (dev)
- **Schema changes:** Edit `prisma/schema.prisma` → `npx prisma db push`
- **Seed:** `npx tsx prisma/seed.ts`
- **For Neon prod:** `npx vercel env pull .env.neon --environment=production` then use those vars

## Git & Deploy
- **Remote:** github.com/nicojoaquin/on-portfolio (personal account)
- **Git user for this repo:** nicojoaquin (configured locally via .git-credential-helper.sh)
- **Deploy:** Push to main → Vercel auto-deploys
- **Production URL:** https://on-portfolio-tau.vercel.app

## Data Sources
- **IOL (InvertirOnline):** Scrapes ON cotizaciones. Primary source.
- **Bolsar:** Secondary source / fallback.
- **Auto-sync:** `/api/quotes` scrapes both sources, creates new bonds automatically, updates prices.
- **Limitations:** Scraping only gets ticker + price. Bond terms (coupon, amortization, etc.) need manual entry or Excel import.

## Important Business Context
- Target: Independent financial advisors in Argentina
- Product will be sold as SaaS subscription
- All ONs must appear automatically (no manual bond creation needed)
- Bond terms enrichment is optional — market TIR from IOL is the default
- See docs/ROADMAP.md for scaling plan
