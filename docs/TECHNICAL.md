# ON Portfolio — Technical Documentation

## Architecture Overview

```
Client (Browser)
    | React hooks (useBonds, usePositions)
    | fetch() calls
API Routes (Next.js /api/*)
    | Prisma ORM
PostgreSQL (Neon) / SQLite (dev)

External Data:
    IOL scraping -> /api/quotes
    Bolsar scraping -> /api/quotes (fallback)
```

## Database Schema

### Bond
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| ticker | String (unique) | Market ticker (e.g., YCA6O) |
| issuer | String | Company name |
| currency | String | USD or ARS |
| law | String | NY or ARG |
| couponRate | Float? | Annual rate as decimal (0.085 = 8.5%) |
| couponFrequency | Int? | Payments/year (1,2,4,12) |
| firstCouponDate | DateTime? | When coupon payments start |
| maturityDate | DateTime? | Bond expiration date |
| amortizationType | String? | bullet, equal, or custom |
| amortStartDate | DateTime? | When amortization begins |
| amortPayments | Int? | Number of amort payments |
| customAmortSchedule | String? | JSON array for custom schedules |
| minDenomination | Float? | Min investment amount |
| creditRating | String? | FIX SCR rating |
| lastPrice | Float? | Last market price (ARS) |
| lastPriceDate | DateTime? | When price was last updated |
| marketTir | Float? | TIR from market data |

Note: Bond term fields (couponRate, couponFrequency, dates) are OPTIONAL. Bonds can exist with only ticker + price from auto-sync.

### Position
| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| bondId | String (FK) | Reference to Bond |
| nominal | Float | Face value held |
| dirtyPrice | Float | Purchase price as % of nominal |

## Financial Calculations (src/lib/financial.ts)

### TIR (XIRR)
- Solves for internal rate of return using Newton-Raphson with bisection fallback
- Day count convention: Actual/365
- Tolerance: 1e-10, max 200 iterations (Newton), 1000 (bisection)
- Falls back to market TIR when bond terms unavailable

### Cash Flow Generation
1. Generate coupon dates from firstCouponDate to maturityDate
2. Generate amortization schedule based on type
3. For each coupon date: coupon = remainingNominal * (couponRate / frequency)
4. Principal returned based on amortization schedule

## Scraping Architecture

### /api/quotes (GET)
1. Scrapes IOL and Bolsar in parallel
2. Merges results (IOL has priority)
3. For each scraped ticker:
   - If exists in DB -> update price
   - If NOT in DB -> create new bond (ticker + price only)
4. Returns summary of synced data

### Data Sources
- **IOL:** `iol.invertironline.com/mercado/cotizaciones/argentina/obligaciones-negociables/todos`
- **Bolsar:** `bolsar.info/Obligaciones_Negociables.php`
- Both use Cheerio for HTML parsing
- No authentication required (public pages)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/bonds | List all bonds |
| POST | /api/bonds | Create bond |
| PUT | /api/bonds/[id] | Update bond |
| DELETE | /api/bonds/[id] | Delete bond |
| GET | /api/positions | List positions with bond data |
| POST | /api/positions | Add position |
| PUT | /api/positions/[id] | Update position |
| DELETE | /api/positions/[id] | Delete position |
| DELETE | /api/positions/clear | Delete ALL positions |
| GET | /api/quotes | Sync quotes from IOL/Bolsar |
| GET | /api/export | Download portfolio as Excel |
| POST | /api/import | Import bond terms from Excel |

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| DATABASE_URL | .env / Vercel | PostgreSQL connection string (prod) or file:./dev.db (dev) |
| DIRECT_URL | Vercel only | Direct Neon connection (bypasses pooler) |
