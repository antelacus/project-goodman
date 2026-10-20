# Project Goodman - Deployment Checklist

**Version**: v4.6
**Last Updated**: 2026-01-26
**Target Platform**: Docker on VPS + Supabase Cloud

---

## How Deployment Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Local Development                                                      │
│         │                                                                │
│         ▼                                                                │
│   Push to `development` ──────► CI (lint, test, build)                  │
│         │                              │                                 │
│         │                              ▼                                 │
│         └──────────────────► Staging auto-deploy + smoke tests          │
│                                        │                                 │
│                                        ▼                                 │
│                              Verify staging works                        │
│                                        │                                 │
│                                        ▼                                 │
│                              Merge `development` → `main`                │
│                                        │                                 │
│                                        ▼                                 │
│                              Production auto-deploy                      │
│                                        │                                 │
│                                        ▼                                 │
│                              Tag release                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### CI/CD Workflows

| Workflow | Trigger | What Happens |
|----------|---------|--------------|
| **CI** | Push to `development` | Lint, type check, test, coverage, quality gates (Lighthouse/A11y/Perf/Audit), build |
| **Deploy Staging** | Push to `development` | Deploy to staging, health check, smoke tests |
| **Deploy Production** | Push to `main` | Deploy to production, health check |

---

## Quick Reference Commands

```bash
# === STAGING ===
# Health check
curl http://localhost:3001/api/health

# Manual deploy (if needed)
cd $GOODMAN_STAGING_DIR/project-goodman
docker compose -f docker-compose.staging.yml up -d --build

# Manual smoke test
SMOKE_BASE_URL=http://localhost:3001 \
SMOKE_ENV_FILE=$GOODMAN_STAGING_DIR/.env.staging \
node scripts/smoke-test-staging.js

# === PRODUCTION ===
# Health check
curl http://localhost:3000/api/health

# Manual deploy (if needed)
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman

# View logs
docker logs -f goodman
```

---

## Phase 1: Development (Automatic)

> **No action required.** These run automatically when you push to `development`.

| Check | Status | Notes |
|-------|--------|-------|
| ESLint | Automatic | Fails CI if errors |
| TypeScript | Automatic | Fails CI if type errors |
| Unit Tests | Automatic | Fails CI if tests fail |
| Coverage | Automatic | Fails CI if below threshold |
| Lighthouse CI | Automatic | Fails CI if scores regress beyond threshold |
| A11y (axe) | Automatic | Fails CI if new critical/serious violations appear |
| Performance Baseline | Automatic | Fails CI if latency/error rate regress beyond threshold |
| Security Audit | Automatic | Fails CI on High/Critical (allowlist required) |
| Build | Automatic | Fails CI if build fails |
| Staging Deploy | Automatic | Deploys after CI passes |
| Smoke Tests | Automatic | Health, auth, sessions, reports |

**If CI or staging fails**: Fix the issue, push again.

---

## Phase 2: Pre-Production Checklist (Manual)

> **Before merging to main**, verify these items.

### 2.1 Staging Verification

- [ ] CI workflow passed (green checkmark on GitHub Actions)
- [ ] Staging deployment passed (smoke tests green)
- [ ] (Optional) Manual testing on staging if needed

### 2.2 Implementation Complete

- [ ] All tasks in PHASE3-5_TRACK.md marked complete
- [ ] No TODO/FIXME comments left in new code
- [ ] TypeScript types regenerated if DB changes: `npx supabase gen types typescript`

### 2.3 Security Review

- [ ] No sensitive data exposed to client
- [ ] Input validation on all new API endpoints
- [ ] Check Supabase security advisors (dashboard → Database → Advisors)

### 2.4 Documentation Updated

- [ ] `package.json` version bumped
- [ ] `CHANGELOG.md` updated with release notes
- [ ] TRACK.md status updated

### 2.5 Commit & Push

```bash
git add .
git commit -m "release(vX.X): description"
git push origin development
```

- [ ] Final CI check passes after release commit

---

## Phase 3: Deploy to Production

> **Merge to main triggers production deployment.**

```bash
git checkout main
git merge development
git push origin main
```

- [ ] Production deploy workflow started (check GitHub Actions)
- [ ] Health check passed (automatic)

### Manual Verification (Optional)

```bash
# Check health
curl http://localhost:3000/api/health

# Watch logs for 5-15 minutes
docker logs -f goodman 2>&1 | grep -i "error\|warn"
```

---

## Phase 4: Release Finalization

> **After production is verified working.**

### 4.1 Tag the Release

```bash
git tag -a vX.X.X -m "Release description"
git push origin vX.X.X
```

### 4.2 Update Documentation

- [ ] Mark feature as released in `v*_DEVELOPMENT_PLAN.md`
- [ ] Move resolved items to "已解决的债务" in `TECHNICAL_DEBT.md`

### 4.3 Return to Development

```bash
git checkout development
```

---

## Rollback Procedures

### Quick Rollback (Code Issue)

```bash
# On server
cd $GOODMAN_PROD_DIR/project-goodman
git checkout HEAD~1
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman

# Verify
curl http://localhost:3000/api/health
```

### Database Rollback

Migrations are forward-only. For schema changes:
1. Backup data before migration
2. Test migrations on staging first
3. Use Supabase branching for major changes

---

## Environment Variables

### Production (`$GOODMAN_PROD_DIR/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | Yes | AI relay API key |
| `LLM_BASE_URL` | Yes | AI relay base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ADMIN_PASSWORD` | Yes | Admin password (plaintext, hashed at runtime) |
| `REDIS_HOST` | Yes | Redis host |
| `REDIS_PORT` | Yes | Redis port |
| `REDIS_PASSWORD` | Yes | Redis password |

### Staging (`$GOODMAN_STAGING_DIR/.env.staging`)

Same variables, but pointing to staging Supabase project.

---

## Infrastructure Reference

### Containers

| Environment | Container | Port | Directory |
|-------------|-----------|------|-----------|
| Production | `goodman` | 3000 | `$GOODMAN_PROD_DIR/` |
| Production | `goodman-redis` | 6379 | - |
| Staging | `goodman-staging` | 3001 | `$GOODMAN_STAGING_DIR/` |
| Staging | `goodman-redis-staging` | 6380 | - |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | `docker logs goodman` |
| Redis connection refused | Verify `goodman-redis` is running |
| Database errors | Check Supabase dashboard |
| Build fails | Run `npm run build` locally first |
| Slow startup | Normal ~10s for cold start |

### Service Monitoring

| Service | Dashboard |
|---------|-----------|
| OpenAI | platform.openai.com/usage |
| Supabase | Dashboard → Usage |
| Sentry | sentry.io |
| UptimeRobot | uptime.com |

---

## Security Baseline

These should always be true:

- [x] Environment variables in `.env` (not in code)
- [x] Service role key server-side only
- [x] Admin password not stored in plaintext in database
- [x] CSRF protection on state-changing operations
- [x] Rate limiting via Redis
- [x] Security headers in next.config.ts

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.6 | 2026-01-26 | v4.6 release (performance-optimization) |
| v4.5 | 2026-01-20 | Added quality gates (Lighthouse/A11y/Perf/Audit) and v4.5 release flow updates |
| v4.4 | 2026-01-18 | Restructured for clarity; added visual flow diagram; separated phases |
| v4.3 | 2026-01-15 | Added CI/CD automation notes, marked automated sections |
| v4.2 | 2026-01-13 | Added post-release documentation section |
| v4.1 | 2026-01-08 | Fixed sequence: pre-deploy docs before deployment |
| v4.0 | 2026-01-08 | Reorganized as Phase 6 execution guide |

---

*Project Goodman v4.6*
