# ConfScout Agent Guidelines

This document provides essential information for AI agents operating in the ConfScout repository.

## 🚀 Commands

### Frontend (Next.js)
- **Dev Server:** `npm run dev` (uses Turbopack)
- **Production Build:** `npm run build`
- **Start:** `npm run start`
- **Linting:** `npm run lint`
- **Type Checking:** `npx tsc --noEmit`

### Testing
- **Run All Tests:** `npm test`
- **Run Security Tests:** `npm run test:security`
- **Watch Mode:** `npm run test:watch`
- **Single Test File:** `npx jest src/__tests__/email.test.ts`
- **Single Test Pattern:** `npx jest --testNamePattern="should validate email format"`
- **Coverage:** `npx jest --coverage`

### Data Processing (Python)
- **Fetch Data:** `npm run fetch-data` or `./scripts/ingest.sh`
- **Install Dependencies:** `pip install -r requirements.txt`
- **Update DB:** `node scripts/init_db.js` (if using Vercel Postgres)

---

## 🛠 Code Style & Conventions

### General
- **Indentation:** 2 spaces for JS/TS, 4 spaces for Python
- **Line Length:** Prefer keeping lines under 100 characters
- **Naming:**
  - **Components:** PascalCase (e.g., `ConferenceCard.tsx`)
  - **Functions/Variables (JS):** camelCase (e.g., `filteredConferences`)
  - **Python Functions/Variables:** snake_case (e.g., `fetch_confs_tech_data`)
  - **Files:** PascalCase for React components, camelCase for TS logic/types
- **Documentation:** Use JSDoc (`/** */`) for JS/TS, docstrings (`""" """`) for Python

### TypeScript / React
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS 4 utility classes
- **Imports:** Use `@/` alias for absolute imports. Order: React/Next → External Libraries → @/types → @/components → @/lib → Styles
- **Types:** Define interfaces for props/data. Prefer `interface` over `type` for objects
- **Components:** Functional components with explicit JSDoc comments
- **Client Components:** Use `'use client';` directive for browser APIs/hooks
- **Security:** Use `SafeHighlightedText` component instead of `dangerouslySetInnerHTML`
- **API Security:** Use `secureFetch()` from `@/lib/api` for CSRF-protected requests
- **Error Handling:** Wrap async operations in try-catch, return `NextResponse` from API routes
- **Dates:** Use `Intl.DateTimeFormatOptions` for locale-aware formatting

### Python
- **Version:** Python 3.x
- **Libraries:** `requests` for HTTP, `BeautifulSoup` for scraping
- **Typing:** Use type hints (`def fetch(url: str) -> List[Dict]:`)
- **Error Handling:** Use try-except with clear logging (`print(f"[FAIL] {url}: {e}")`)
- **Paths:** Use `pathlib.Path` instead of `os.path`

---

## 🔒 Security Guidelines

- **XSS Prevention:** Never use `dangerouslySetInnerHTML`. Use `SafeHighlightedText` for highlights
- **CSRF Protection:** Use `secureFetch()` for state-changing API calls
- **Input Validation:** Use Zod schemas for API route validation
- **SQL Injection:** Use parameterized queries, never string concatenation
- **Secret Management:** Use environment variables, never commit `.env` files
- **URL Validation:** Validate and sanitize external URLs before use

---

## 📂 Project Structure

- `src/app/`: Next.js App Router pages and API routes
- `src/components/`: Reusable React components
- `src/types/`: TypeScript interfaces (`conference.ts` is the core model)
- `src/lib/`: Shared utilities, database clients, security helpers
- `src/__tests__/`: Test files organized by feature/security
- `scripts/`: Python data processing and scraping scripts
- `public/data/`: Generated JSON data files

---

## 🧪 Testing Conventions

- **File Naming:** `*.test.ts` in `src/__tests__/` directory
- **Setup:** Use `src/__tests__/setup.ts` for test configuration
- **Security Tests:** Comprehensive security test suite in `src/__tests__/security/`
- **Mock Data:** Mock environment variables in setup file
- **Coverage:** Maintain 50% minimum coverage threshold

---

## 🤖 Agent Best Practices

1. **Data Model:** Reference `src/types/conference.ts` for schema compliance
2. **Security First:** Always use security utilities (`secureFetch`, `SafeHighlightedText`)
3. **Error Handling:** Implement proper try-catch blocks with user-friendly messages
4. **Performance:** Use lazy loading, pagination, and caching where appropriate
5. **Accessibility:** Include proper ARIA labels and semantic HTML
6. **Testing:** Write tests for new features, especially security-critical code
7. **Database:** Use connection pooling, parameterized queries, proper transaction handling
8. **Constants:** Define domain info and configuration at module level
