# ON Portfolio — Roadmap & Scaling Plan

## Phase 1: MVP (Current)
- [x] Bond CRUD with manual entry
- [x] Portfolio TIR calculation (XIRR)
- [x] Coupon calendar
- [x] Yield curve chart
- [x] Distribution charts (by issuer, law, currency, rating)
- [x] Excel export
- [x] Clear all positions
- [x] 18 seeded corporate ONs
- [x] Price scraping from IOL + Bolsar
- [x] Lamina minima and FIX SCR rating fields
- [ ] Auto-sync: create ALL ONs from IOL scraping
- [ ] Excel import for bond terms
- [ ] Use market TIR when bond terms unavailable

## Phase 2: First Clients (5-10 users)
- [ ] User authentication (NextAuth or Clerk)
- [ ] Multi-tenant: each advisor has their own portfolio
- [ ] Migrate from scraping to IOL official API (free tier: 25K calls/month)
- [ ] Stripe/MercadoPago payment integration
- [ ] Bond detail page with full prospectus info
- [ ] Alerts: notify when coupon payment is near
- [ ] Mobile-responsive improvements

## Phase 3: Growth (30+ users)
- [ ] Migrate to BYMA official data feed (USD 200-500/month)
- [ ] Real-time or 15-min delayed quotes
- [ ] Portfolio comparison tools
- [ ] Model portfolios (suggested allocations)
- [ ] Client management (advisor manages multiple client portfolios)
- [ ] PDF reports generation
- [ ] WhatsApp integration for alerts

## Phase 4: Scale (100+ users)
- [ ] Custom domain (e.g., onportfolio.com.ar)
- [ ] Dedicated infrastructure
- [ ] API for third-party integrations
- [ ] Bloomberg/Refinitiv data feed (if justified by revenue)

## Data Source Scaling Plan

| Stage | Source | Cost | Capacity |
|-------|--------|------|----------|
| MVP | IOL/Bolsar scraping | Free | ~50 users max |
| Phase 2 | IOL API (free tier) | Free | 25K calls/month (~100 users) |
| Phase 2+ | IOL API (paid) | USD 50-200/month | Unlimited |
| Phase 3 | BYMA Data | USD 200-500/month | Professional grade |
| Phase 4 | Refinitiv/Bloomberg | USD 1000-5000/month | Enterprise |

## Risk Mitigation
- **Scraping breaks:** We have 2 sources (IOL + Bolsar). Adding more is trivial.
- **IOL blocks us:** Migrate to official API (already planned for Phase 2)
- **Data completeness:** Bond terms from Excel import + client's Balanz data
- **Scaling DB:** Neon PostgreSQL scales automatically
