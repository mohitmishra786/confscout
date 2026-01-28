# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
- **Dev Server:** `npm run dev` (uses Turbopack)
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
- **Type Checking:** `npx tsc --noEmit`
- **Start Production:** `npm run start`

### Data Processing (Python)
- **Fetch Conference Data:** `npm run fetch-data` or `python3 scripts/fetch_confs.py`
- **Install Python Dependencies:** `pip install -r requirements.txt`
- **Initialize Database:** `node scripts/init_db.js` (for Vercel Postgres setup)

### Testing
- No automated test suite exists. Verify changes manually by running the dev server and testing functionality.

## High-Level Architecture

ConfScout is a modern conference discovery platform built with Next.js 15 and Python data pipelines. The architecture consists of three main layers:

### 1. Data Layer (`scripts/` & `public/data/`)
The platform aggregates conference data from multiple sources:
- **Primary Source:** tech-conferences/conference-data GitHub repository (JSON files by year/topic)
- **Secondary Sources:** Sessionize CFP pages (individual scraping)
- **Processing:** Python scripts handle fetching, geocoding, deduplication, and domain classification
- **Output:** Single `conferences.json` file with month-grouped conference data
- **Key Files:** 
  - `fetch_confs.py` - Main data fetcher with geocoding cache
  - `sources/` - Modular scraper architecture
  - `utils/geocoder.py` - Nominatim integration with rate limiting

### 2. Backend Layer (`src/app/api/`)
Serverless API routes built with Next.js App Router:
- **Subscription System:** Email subscriptions with PostgreSQL storage (Vercel Postgres)
- **Email Service:** Zoho Mail integration via nodemailer (`src/lib/email.ts`)
- **RSS Feed:** Dynamic RSS generation at `src/app/rss.xml/route.ts`
- **Cron Jobs:** Weekly digest emails via `api/cron/digest/route.ts`
- **Database:** Connection pooling in `src/lib/db.ts` with environment-aware SSL

### 3. Frontend Layer (`src/app/` & `src/components/`)
React-based UI with server/client component architecture:
- **Interactive World Map:** Leaflet + CartoDB Dark Matter tiles with marker clustering
- **Domain Filtering:** Dynamic filtering by tech domain (AI, Web Dev, Security, etc.)
- **Search:** Fuse.js fuzzy search for conferences
- **Components:** Modular React components using Tailwind CSS 4

### Data Flow Architecture
1. **Data Pipeline:** Python scripts → `conferences.json` → Frontend consumption
2. **User Flow:** Browse → Subscribe → Email Digest → Unsubscribe (no user accounts required)
3. **Type Safety:** Conference interface in `src/types/conference.ts` drives both Python output formatting and TypeScript validation

### Key Technical Patterns
- **Import Aliasing:** Use `@/` prefix for absolute imports from `src/` directory
- **Geocoding Cache:** `scripts/city_cache.json` prevents redundant Nominatim API calls
- **Domain Classification:** Keyword-based classification in `fetch_confs.py` with priority scoring
- **Financial Aid Detection:** Pattern matching detects scholarship/travel grant opportunities
- **Environment-Aware Database:** SSL validation only in production (`NODE_ENV === 'production'`)

## Important Constraints

### Data Integrity
- All conference data must match the `Conference` interface in `src/types/conference.ts`
- Python scripts output ISO 8601 dates (YYYY-MM-DD format)
- Geocoding requires 1-second delays between requests to respect Nominatim rate limits
- Coordinate caching is mandatory - never disable cache

### Email System
- No verification tokens - simplified subscription flow
- Zoho Mail SMTP configuration via environment variables
- List-Unsubscribe headers included in all emails
- Frequency options: daily, weekly
- Domain-specific subscriptions supported

### Styling & UX
- Tailwind CSS 4 with utility-first approach
- Dark theme using CartoDB Dark Matter map tiles
- No emojis in code comments or commit messages (per AGENTS.md)
- Mobile-responsive design required

### Database Operations
- Always use `try-finally` blocks for database connection management
- Use parameterized queries to prevent SQL injection
- Environment variable `DATABASE_URL` for Postgres connection
- SSL validation strict in production, permissive in development

## Environment Variables Required
- `DATABASE_URL` - Vercel Postgres connection string
- `ZOHO_SMTP_HOST` - SMTP server (default: smtppro.zoho.in)
- `ZOHO_SMTP_PORT` - SMTP port (default: 587)
- `ZOHO_USER` / `ZOHO_EMAIL` - Zoho email address
- `ZOHO_PASSWORD` - Zoho app password
- `NEXT_PUBLIC_APP_URL` - Public app URL (default: https://confscout.site)
- `NODE_ENV` - Environment (development/production)

## Project Structure Notes
- `src/constants/domains.ts` - Domain metadata (icons, colors, descriptions)
- `src/lib/search.ts` - Fuse.js search configuration
- `src/lib/conferences.ts` - Conference data loading and filtering utilities
- `src/components/WorldMap.tsx` - Interactive map component with clustering
- `src/components/TimelineView.tsx` - Alternative timeline visualization
- `public/data/conferences.json` - Generated data file (never edit manually)