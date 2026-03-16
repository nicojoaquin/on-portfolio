# ON Portfolio — Development Setup

## Prerequisites

### Required Software
- **Node.js** 20+ (recommend using nvm)
- **npm** (comes with Node)
- **Git**
- **Claude Code CLI** (`npm install -g @anthropic-ai/claude-code`)

### Optional but Recommended
- **Neon CLI** (`npm install -g neonctl`) — for managing production database
- **Vercel CLI** (`npm install -g vercel`) — for deployment management
- **GitHub CLI** (`brew install gh` on Mac) — for repo management

### Accounts Needed
- **GitHub:** github.com/nicojoaquin (personal account for this repo)
- **Vercel:** vercel.com (linked to GitHub, auto-deploys)
- **Neon:** neon.tech (PostgreSQL database)

## First-Time Setup

```bash
# 1. Clone
git clone https://github.com/nicojoaquin/on-portfolio.git
cd on-portfolio

# 2. Install dependencies
npm install

# 3. Setup local database (SQLite for dev)
# Edit prisma/schema.prisma: change provider to "sqlite"
# Create .env with: DATABASE_URL="file:./dev.db"
npx prisma db push
npx tsx prisma/seed.ts

# 4. Run dev server
npm run dev
# Open http://localhost:3000

# 5. (Optional) Pull production env vars
npx vercel env pull .env.neon --environment=production
```

## Working with Production Database

```bash
# Pull Neon credentials
npx vercel env pull .env.neon --environment=production

# Push schema changes to prod
export $(cat .env.neon | grep -v '#' | grep -v '^$' | xargs) && npx prisma db push

# Seed prod
export $(cat .env.neon | grep -v '#' | grep -v '^$' | xargs) && npx tsx prisma/seed.ts

# Clean up (don't leave prod credentials lying around)
rm .env.neon
```

## Git Configuration

This repo uses the personal GitHub account `nicojoaquin` (not MeLi account).
The credential helper is configured in `.git-credential-helper.sh`.

If on a new machine:
```bash
git config user.name "nicojoaquin"
git config user.email "nicojoaquin@users.noreply.github.com"
# The .git-credential-helper.sh handles auth via gh CLI
chmod +x .git-credential-helper.sh
git config credential.helper "/path/to/on-portfolio/.git-credential-helper.sh"
```

## Claude Code Setup (for new machine)

### 1. Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Skills to install/configure
The following skills are used in this project (from prepapp):
- `commit-work` — for structured git commits
- `simplify` — code review for reuse, quality, efficiency

### 3. Key MCPs (not needed for this project but useful)
This project doesn't use MeLi-specific MCPs. It's a personal project.

### 4. Useful VS Code extensions
- Prisma (for schema highlighting)
- Tailwind CSS IntelliSense
- ESLint

## Deploy

Push to `main` branch -> Vercel auto-deploys.

```bash
git push origin main
# Check deploy status:
npx vercel ls
```

Production URL: https://on-portfolio-tau.vercel.app
