# ConfScout Agent Guidelines

This document provides essential information for AI agents operating in the ConfScout repository.

## 🚀 Commands

### Frontend (Next.js)
- **Dev Server:** `npm run dev` (uses Turbopack)
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
- **Type Checking:** `npx tsc --noEmit`
- **Start:** `npm run start`

### Data Processing (Python)
- **Fetch Data:** `npm run fetch-data` or `python3 scripts/fetch_confs.py`
- **Install Dependencies:** `pip install -r requirements.txt`
- **Update DB:** `node scripts/init_db.js` (if using Vercel Postgres)

### Testing
- No automated test suite is currently implemented. When adding logic, verify manually or add a temporary script in `scripts/`.

---

## 🛠 Code Style & Conventions

### General
- **Indentation:** 2 spaces for JS/TS, 4 spaces for Python.
- **Line Length:** Prefer keeping lines under 100 characters where possible.
- **Naming:**
  - **Components:** PascalCase (e.g., `ConferenceCard.tsx`)
  - **Functions/Variables (JS):** camelCase (e.g., `filteredConferences`)
  - **Python Functions/Variables:** snake_case (e.g., `fetch_confs_tech_data`)
  - **Files:** PascalCase for React components, camelCase for TS logic/types.
- **Documentation:** Use JSDoc (`/** */`) for JS/TS, triple-quoted strings (`""" """`) for Python.

### TypeScript / React
- **Framework:** Next.js 15 (App Router).
- **Styling:** Tailwind CSS 4. Use utility classes directly in components.
- **Imports:** Use the `@/` alias for absolute imports from the `src/` directory.
  - *Order:* React/Next -> External Libraries -> @/types -> @/components -> @/lib -> Styles.
- **Types:** Always define interfaces for props and data structures. Prefer `interface` over `type` for objects.
- **Components:** Use functional components with arrow functions or standard `function` keyword.
- **Directives:** Use `'use client';` at the top of files that use React hooks or browser APIs.
- **Date Formatting:** Use `Intl.DateTimeFormatOptions` for locale-aware date strings (e.g., `{ month: 'short', day: 'numeric' }`).
- **API Routes:** Use Zod schemas for request validation. Handle errors with try-catch and return `NextResponse`.
- **Async Patterns:** Always use async/await for database operations, external API calls, and data fetching.

### Python
- **Version:** Python 3.x.
- **Library:** Use `requests` for fetching and `BeautifulSoup` for scraping.
- **Typing:** Use type hints for function signatures (e.g., `def fetch(url: str) -> List[Dict]:`).
- **Docstrings:** Use triple-quoted strings for module and function descriptions.
- **Error Handling:** Use `try...except` blocks with clear logging (e.g., `print(f"[FAIL] {url}: {e}")`).
- **Paths:** Use `pathlib.Path` for filesystem operations instead of `os.path`.

---

## 📂 Project Structure

- `src/app/`: Next.js App Router pages and API routes.
- `src/components/`: Reusable React components.
- `src/types/`: TypeScript interfaces (see `conference.ts` for the core model).
- `src/lib/`: Shared utility logic and database clients.
- `scripts/`: Python scripts for data aggregation and fetching.
- `scripts/sources/`: Individual scrapers for different conference sources (e.g., `wikicfp.py`).
- `public/data/`: Generated JSON data files (e.g., `conferences.json`).

---

## 🤖 Agent Advice

1. **Data Model:** When modifying the conference scraper, refer to `src/types/conference.ts` to ensure the JSON output matches the expected frontend interface.
2. **Geocoding:** Use `scripts/city_cache.json` and the `geocoder.py` utility to avoid unnecessary API calls to Nominatim.
3. **Scraping:** Be mindful of rate limits. Use headers (User-Agent) and add small delays (`time.sleep(1)`) between requests if fetching multiple pages.
4. **Tailwind:** This project uses **Tailwind CSS 4**. Be aware of the latest syntax if modifying global CSS or complex animations.
5. **No Secrets:** Ensure `.env` files are never committed. Use environment variables for sensitive data like DB URLs or API keys.
6. **Database Transactions:** Always use `try-finally` to release database connections after operations.
7. **Constants:** Define configuration constants at module level (e.g., `DOMAIN_INFO` in types) rather than magic values.
