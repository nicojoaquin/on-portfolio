# ON Portfolio

Calculadora de TIR y gestor de cartera para Obligaciones Negociables argentinas. Herramienta SaaS para asesores financieros independientes.

**Prod:** https://on-portfolio-tau.vercel.app

## Stack

- **Frontend:** Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + Recharts
- **Backend:** Next.js API Routes + Prisma ORM
- **DB:** PostgreSQL (Neon serverless)
- **Deploy:** Vercel (auto-deploy desde `main`)
- **Data:** Scraping IOL + Bolsar para cotizaciones y auto-sync de ONs

## Setup en nueva PC

### Prerequisitos

- Node.js 20+
- npm
- Git
- GitHub CLI (`gh`) — para autenticación y push

### 1. Clonar el repo

```bash
git clone https://github.com/nicojoaquin/on-portfolio.git
cd on-portfolio
```

### 2. Instalar dependencias

```bash
npm install
```

Esto también ejecuta `prisma generate` automáticamente (postinstall).

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Editar `.env` y completar con la connection string de Neon:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
```

> La connection string se obtiene desde el [dashboard de Neon](https://console.neon.tech) o con `npx neonctl connection-string --project-id damp-forest-24825616 --org-id org-nameless-silence-60130324`.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000.

## Autenticación GitHub

El repo usa la cuenta `nicojoaquin`. Para configurar:

```bash
gh auth login  # loguearse como nicojoaquin
```

Si tenés múltiples cuentas de GitHub, el repo incluye `.git-credential-helper.sh` que usa automáticamente el token de `nicojoaquin` para este repo.

## Deploy

El deploy es automático: cada push a `main` dispara un deploy en Vercel.

El build script (`prisma generate && prisma db push && next build`) se encarga de:
1. Generar el Prisma Client
2. Sincronizar el schema con la DB de producción
3. Buildear la app

Para deploy manual:

```bash
npx vercel login    # primera vez
npx vercel link     # linkear al proyecto existente
npx vercel --prod   # deploy manual
```

## Scripts

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (localhost:3000) |
| `npm run build` | Build de producción (genera Prisma + push DB + build Next.js) |
| `npm run db:push` | Sincronizar schema Prisma con la DB |
| `npm run db:studio` | Abrir Prisma Studio (UI para explorar la DB) |
| `npm run db:seed` | Cargar 18 ONs de ejemplo con datos completos |

## Estructura del proyecto

```
src/
  app/
    api/
      bonds/        GET (paginado, filtros, búsqueda), POST
      bonds/[id]/   PUT, DELETE
      quotes/       GET — scraping IOL + Bolsar, auto-sync de ONs
      positions/    GET, POST
      positions/[id]/ PUT, DELETE
      positions/clear/ DELETE — borrar todas
      export/       GET — descarga Excel
      import/       POST — importar Excel con datos de bonos
    page.tsx        Página principal con tabs
  components/
    PortfolioTab    Cartera: métricas, yield curve, distribución, posiciones
    BondsTab        Base de ONs: búsqueda, filtros, paginación, CRUD
    CouponsTab      Cronograma de cobros futuros
    YieldCurveChart Gráfico scatter TIR vs años al vencimiento
    DistributionCharts  Tortas de distribución por emisor/moneda/ley/rating
  hooks/
    useBonds        Hook con paginación, filtros y CRUD
    usePositions    Hook para posiciones del portfolio
  lib/
    financial       Motor de cálculo: XIRR, cash flows, amortización
    formatters      Formateo de moneda, fechas, porcentajes
    prisma          Singleton del Prisma Client
  types/            DTOs e interfaces
prisma/
  schema.prisma     Schema de la DB
  seed.ts           Seed con 18 ONs reales
docs/
  BUSINESS.md       Contexto de negocio
  TECHNICAL.md      Arquitectura técnica
  ROADMAP.md        Plan de evolución y scaling
  SETUP.md          Guía detallada de setup
CLAUDE.md           Instrucciones para Claude Code
```

## Documentación adicional

- [`docs/BUSINESS.md`](docs/BUSINESS.md) — Contexto de negocio, usuarios target, modelo de revenue
- [`docs/TECHNICAL.md`](docs/TECHNICAL.md) — Arquitectura, schema de DB, cálculos financieros
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — Roadmap de features y plan de scaling de datos
- [`docs/SETUP.md`](docs/SETUP.md) — Guía completa de setup y configuración
