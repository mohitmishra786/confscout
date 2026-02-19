# ConfScout Agent Guidelines

Essential information for AI agents operating in the ConfScout repository.

## 🚀 Commands

### Frontend (Next.js)
- **Dev Server:** `npm run dev` (uses Turbopack)
- **Production Build:** `npm run build`
- **Start:** `npm run start`
- **Linting:** `npm run lint`
- **Type Check:** `npx tsc --noEmit`

### Testing
- **Run All:** `npm test`
- **Security Tests:** `npm run test:security`
- **Watch Mode:** `npm run test:watch`
- **Single File:** `npx jest src/__tests__/email.test.ts`
- **By Pattern:** `npx jest --testNamePattern="should validate email format"`
- **Coverage:** `npx jest --coverage`

### Database (Prisma)
- **Generate Client:** `npx prisma generate`
- **Migrate:** `npx prisma migrate dev`
- **Deploy Migrations:** `npx prisma migrate deploy`
- **Studio:** `npx prisma studio`
- **Seed:** `npx prisma db seed`

### Data Processing (Python)
- **Fetch Data:** `npm run fetch-data` or `./scripts/ingest.sh`
- **Install:** `pip install -r requirements.txt`
- **Update DB:** `node scripts/init_db.js`

---

## 🛠 Code Style & Conventions

### General
- **Indentation:** 2 spaces (JS/TS), 4 spaces (Python)
- **Line Length:** Keep under 100 characters
- **Naming:**
  - Components: PascalCase (e.g., `ConferenceCard.tsx`)
  - Functions/Variables (JS): camelCase (e.g., `filteredConferences`)
  - Python: snake_case (e.g., `fetch_confs_tech_data`)
  - Files: PascalCase (components), camelCase (logic/types)
- **Documentation:** JSDoc (`/** */`) for JS/TS, docstrings for Python

### TypeScript / React
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4 utility classes
- **Imports:** Use `@/` alias. Order: React/Next → External → @/types → @/components → @/lib → Styles
- **Types:** Prefer `interface` over `type` for objects. Define in `@/types/conference.ts`
- **Components:** Functional components with JSDoc comments
- **Client Components:** Use `'use client';` for browser APIs/hooks
- **Date Handling:** Use `date-fns` and `Intl.DateTimeFormatOptions` for formatting
- **Validation:** Use Zod schemas for API input validation (see `apiSchemas.ts`)

### Python
- **Version:** Python 3.x
- **Libraries:** `requests` for HTTP, `BeautifulSoup` for scraping
- **Typing:** Use type hints (`def fetch(url: str) -> List[Dict]:`)
- **Error Handling:** Use try-except with clear logging: `print(f"[FAIL] {url}: {e}")`
- **Paths:** Use `pathlib.Path` instead of `os.path`
- **User-Agent:** Use proper User-Agent headers (see `utils/http_client.py`)

### Security Utilities
- **XSS Prevention:** Never use `dangerouslySetInnerHTML`. Use `SafeHighlightedText`
- **API Requests:** Use `secureFetch()` from `@/lib/api` for CSRF-protected calls
- **CSRF:** Always validate tokens server-side using `validateCsrfToken()`
- **Input Validation:** Use Zod schemas before processing requests
- **SQL Injection:** Use parameterized queries, never string concatenation

---

## 📂 Project Structure

- `src/app/`: Next.js App Router pages and API routes
- `src/components/`: Reusable React components
- `src/types/`: TypeScript interfaces (conference.ts is core model)
- `src/lib/`: Shared utilities, database clients, security helpers
- `src/__tests__/`: Test files organized by feature/security
- `src/context/`: React context providers
- `scripts/`: Python data processing and scraping scripts
- `prisma/`: Database schema and migrations
- `public/data/`: Generated JSON data files

---

## 🔒 Security Guidelines

### Frontend
- Never use `dangerouslySetInnerHTML`. Use `SafeHighlightedText` for search highlights
- Use `SafeImage` for external images with SVG sanitization
- Use `SafeJsonLd` for structured data to prevent injection

### API Routes
- Use Zod schemas for input validation (`@/lib/apiSchemas.ts`)
- Always validate CSRF tokens for state-changing operations
- Use parameterized queries for database operations
- Implement rate limiting on sensitive endpoints
- Return sanitized error messages (no stack traces in production)

### Python Scrapers
- Respect robots.txt and rate limits
- Use descriptive User-Agent strings
- Handle timeouts and retries gracefully
- Sanitize scraped data before storage

### Environment Variables
- Never commit `.env` files
- Use `.env.example` as template
- Access via `process.env` (validated in `@/lib/env.ts`)

---

## 🧪 Testing Conventions

- **File Naming:** `*.test.ts` in `src/__tests__/` directory
- **Setup:** Configure in `src/__tests__/setup.ts`
- **Mocking:** Mock external APIs and environment variables in setup
- **Coverage:** Maintain 50% minimum threshold (branches, functions, lines, statements)
- **Security Tests:** Comprehensive suite in `src/__tests__/security/`

---

## 🤖 Agent Best Practices

1. **Data Model:** Reference `src/types/conference.ts` for all conference-related types
2. **Security First:** Always use security utilities (`secureFetch`, `SafeHighlightedText`)
3. **Error Handling:** Wrap async operations in try-catch with user-friendly messages
4. **Performance:** Use memo for expensive components, implement pagination for lists
5. **Accessibility:** Include proper ARIA labels and semantic HTML
6. **Testing:** Write tests for new features, especially security-critical code
7. **Database:** Use Prisma client with proper connection handling
8. **Logging:** Use the logger utility (`@/lib/logger.ts`) for consistent logging
9. **Constants:** Define domain info and config at module level (e.g., `DOMAIN_INFO`)
10. **Type Safety:** Enable strict TypeScript checking, avoid `any` types

---

## 📚 Key Files Reference

- **Types:** `src/types/conference.ts` - Core data models
- **API Client:** `src/lib/api.ts` - Secure HTTP client with CSRF
- **Validation:** `src/lib/apiSchemas.ts` - Zod schemas for API validation
- **Security:** `src/lib/csrf.ts`, `src/lib/csrf-constants.ts` - CSRF utilities
- **Database:** `src/lib/prisma.ts` - Prisma client configuration
- **Cache:** `src/lib/cache.ts` - Redis and in-memory caching
- **Error Handling:** `src/lib/errorHandler.ts` - Standardized error responses
