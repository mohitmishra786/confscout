# Secret & API Key Rotation Runbook

Issue **#292**. Production-grade procedure for rotating ConfScout secrets
while keeping the site available. **Service uptime is not the same as
session continuity** — some rotations (especially `NEXTAUTH_SECRET`) force
users to sign in again even when the app never goes offline.

## Secrets inventory

| Secret | Where used | Rotate when |
|--------|------------|-------------|
| `DATABASE_URL` | Prisma, Postgres pool | Credential leak, staff change |
| `NEXTAUTH_SECRET` | Session JWT signing | Leak, quarterly hygiene |
| `ZOHO_PASSWORD` / SMTP | Digest email | Leak, password policy |
| `UPSTASH_REDIS_REST_TOKEN` | Cache + rate limit | Leak, quarterly |
| `GROQ_API_KEY` | Recommendations / digest AI | Leak, provider rotation |
| `CACHE_INVALIDATION_SECRET` | Ingest → `/api/cache/invalidate` | Leak, after CI secret compromise |
| `PAT_TOKEN` (GitHub) | Ingest workflow push | Leak, staff change |
| Sentry DSN / auth token | Error monitoring | Leak |

Never commit values. Store only in Vercel Project Env + GitHub Actions secrets.

## Standard rotation steps (non-database secrets)

Use this sequence for Upstash, Groq, Zoho, GitHub PAT, Sentry, and
`CACHE_INVALIDATION_SECRET`. **Do not use this sequence for `DATABASE_URL`**
— see [Postgres / DATABASE_URL](#postgres--database_url) below.

1. **Generate** the new secret (CSPRNG; min 32 bytes for HMAC secrets).
2. **Add** the new value alongside the old one if dual-read is supported
   (NextAuth does **not** dual-read — plan a short auth disruption window).
3. **Deploy** the application with the new env var (Vercel → Redeploy).
4. **Verify** (must fail the check on non-2xx — do not swallow errors):
   - Health: `curl --fail --silent --show-error "$APP_URL/api/health"`
   - Sign-in still works (see NextAuth section)
   - Cache invalidate (see CACHE_INVALIDATION_SECRET section)
5. **Revoke** the old secret at the provider **after** deploy + verification
   succeed (except where dual-active keys are not possible).
6. **Record** rotation date in the team password manager / ops log.

## Postgres / DATABASE_URL

Database credentials must **not** be revoked before every instance has the
new URL. Sequence:

1. Create a new Postgres role/password (or rotate via provider UI) while
   keeping the old credential active.
2. Set `DATABASE_URL` to the new credential in Vercel (all environments that
   hit the DB).
3. Redeploy **all** app instances and wait for old serverless isolates to
   drain (or force a full redeploy / wait past idle timeout).
4. Verify: `curl --fail "$APP_URL/api/health"` reports `database: up`, and a
   known Prisma-backed page (e.g. bookmarks while signed in) still works.
5. Only then revoke or drop the old Postgres credential.
6. Keep an overlap window (recommended ≥ 30 minutes) between step 3 and
   step 5 so cold starts that still have the old env cannot brick the app.

## NextAuth secret specifically

Changing `NEXTAUTH_SECRET` **invalidates all existing sessions**. The site
stays up, but every user must log in again.

Deployment checklist for this rotation:

- [ ] Announce a forced re-login (prefer low-traffic window)
- [ ] Deploy with the new `NEXTAUTH_SECRET`
- [ ] Confirm old session cookies are rejected (open a private window with an
      old cookie → should be signed out)
- [ ] Confirm **fresh login succeeds** (password and/or OAuth provider)
- [ ] Confirm protected routes work after the new login
- [ ] Revoke any leaked copy of the old secret

## CACHE_INVALIDATION_SECRET

1. Generate: `openssl rand -hex 32`
2. Update Vercel env + GitHub Actions secret `CACHE_INVALIDATION_SECRET`
3. Redeploy the app
4. **Direct validation** (must fail the shell on non-2xx — do not use
   `|| echo "non-fatal"` when validating a rotation):

```bash
# Expect HTTP 200 (or 2xx). --fail makes curl exit non-zero otherwise.
curl --fail --silent --show-error \
  -X POST "${APP_URL}/api/cache/invalidate" \
  -H "Authorization: Bearer ${CACHE_INVALIDATION_SECRET}" \
  -H "Content-Type: application/json" \
  -o /tmp/cache-invalidate-body.json \
  -w "HTTP %{http_code}\n"

# Optional: reject unexpected bodies
test -s /tmp/cache-invalidate-body.json
```

Note: `sync_events.yml` uses `|| echo "Cache invalidation failed (non-fatal)"`
so a failed invalidate does **not** fail that workflow. That is intentional for
CI resilience and **must not** be used as proof of a successful secret rotation.
Always use the direct `curl --fail` check above after rotating this secret.

## Quarterly checklist

- [ ] Rotate `NEXTAUTH_SECRET` (or confirm still private) and verify re-login
- [ ] Rotate Upstash token
- [ ] Rotate Groq key
- [ ] Review GitHub PATs and remove unused
- [ ] Confirm no secrets in git history (`git log -p | rg -i 'password|secret|api_key'`)

## Incident response

If a secret is exposed in a PR, log, or chat:

1. Rotate immediately (do not wait for the quarterly window).
2. For dual-active providers, rotate then deploy then revoke. For single-active
   secrets, minimize the window between deploy and revoke.
3. Open a private security note and audit access logs for the secret’s surface.
4. For `DATABASE_URL`, never revoke the old password until every deployment has
   the new URL (see Postgres section).
