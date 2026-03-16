# ON Portfolio — Business Context

## What is this?
A SaaS tool for Argentine financial advisors to manage portfolios of Obligaciones Negociables (corporate bonds). Calculates TIR, projects cash flows, and visualizes portfolio distribution.

## Target Users
- Independent financial advisors (asesores financieros independientes)
- First client works at Balanz (broker)
- Goal: sell to multiple advisors as subscription

## Value Proposition
1. **All ONs in one place** — auto-synced from market, no manual loading
2. **Portfolio analysis** — TIR calculation, yield curve, distribution charts
3. **Coupon calendar** — when and how much each bond pays (requires bond terms)
4. **Export** — Excel download for client reports

## Revenue Model
- SaaS subscription: USD 20-50/month per advisor
- 10 advisors = USD 200-500/month (covers all infra costs)
- 50 advisors = USD 1000-2500/month (profitable)

## Current State (March 2026)
- MVP deployed at on-portfolio-tau.vercel.app
- 18 seeded ONs + auto-sync from IOL/Bolsar
- Features: portfolio TIR, yield curve, distribution charts, Excel export, clear all
- Missing: full IOL auto-sync (creating new bonds), Excel import for bond terms

## Key Stakeholder
- Juan Bustamante — first client, works at Balanz
- Can provide: bond master data (Excel export from Balanz backoffice)
- Feedback channel: WhatsApp
