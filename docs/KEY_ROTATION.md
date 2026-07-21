# Secret & API Key Rotation Runbook

Issue **#292**. Production-grade procedure for rotating ConfScout secrets
without downtime.

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

## Standard rotation steps

1. **Generate** the new secret (use a CSPRNG; min 32 bytes for HMAC secrets).
2. **Add** the new value alongside the old one if dual-read is supported
   (NextAuth does not dual-read — plan a short deploy window).
3. **Deploy** application with the new env var (Vercel → Redeploy).
4. **Verify** health (`GET /api/health`), sign-in, digest dry-run, cache
   invalidate from Actions.
5. **Revoke** the old secret at the provider (Upstash, Groq, Zoho, GitHub).
6. **Record** rotation date in the team password manager / ops log.

## NextAuth secret specifically

Changing `NEXTAUTH_SECRET` invalidates all existing sessions. Prefer rotating
during low traffic and announce a forced re-login.

## CACHE_INVALIDATION_SECRET

1. Generate: `openssl rand -hex 32`
2. Update Vercel env + GitHub Actions secret `CACHE_INVALIDATION_SECRET`
3. Redeploy app, then re-run ingest workflow to confirm `Bearer` auth works

## Quarterly checklist

- [ ] Rotate `NEXTAUTH_SECRET` (or confirm still private)
- [ ] Rotate Upstash token
- [ ] Rotate Groq key
- [ ] Review GitHub PATs and remove unused
- [ ] Confirm no secrets in git history (`git log -p | rg -i 'password|secret|api_key'`)

## Incident response

If a secret is exposed in a PR, log, or chat:

1. Rotate immediately (do not wait for the quarterly window).
2. Revoke the old credential first when the provider allows dual-active keys;
   otherwise rotate then deploy within minutes.
3. Open a private security note and audit access logs for the secret’s surface.
