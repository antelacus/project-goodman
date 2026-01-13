# Project Goodman - Deployment Checklist

**Version**: v4.2
**Last Updated**: 2026-01-13
**Target Platform**: Docker on VPS + Supabase Cloud

> This checklist covers the complete Phase 6 deployment process.
> Referenced by global `~/.claude/CLAUDE.md`.

---

## Quick Reference

```bash
# Deploy
cd /home/deploy/goodman && docker compose up -d --build goodman

# Verify
curl http://localhost:3000/api/health

# Logs
docker logs -f goodman
```

---

## 1. Pre-Deployment Verification

### 1.1 Implementation Complete

- [ ] All tasks in PHASE3-5_TRACK.md marked complete
- [ ] No TODO/FIXME comments left in new code
- [ ] TypeScript types regenerated (if DB changes): `npx supabase gen types typescript`

### 1.2 Environment Variables

Verify in `/home/deploy/goodman/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `ADMIN_PASSWORD` | ✅ | Bcrypt hash for admin auth |
| `REDIS_URL` | ✅ | Redis connection URL |

### 1.3 Database Status

| Check | Command |
|-------|---------|
| Migrations applied | Supabase dashboard or `supabase db diff` |
| Types in sync | `npx supabase gen types typescript` |
| Security advisors | Supabase dashboard → Database → Advisors |

---

## 2. Quality Gates

### 2.1 Build Verification

```bash
npm run build  # Must complete with 0 errors
```

### 2.2 Security Audit

- [ ] No sensitive data exposed to client
- [ ] No stack traces in error responses
- [ ] Input validation on all API endpoints
- [ ] Check Supabase security advisors (MCP or dashboard)

### 2.3 Code Review

- [ ] New code follows project conventions
- [ ] No obvious bugs or edge case issues
- [ ] Performance: no unnecessary re-renders, API calls, or DB queries

---

## 3. Pre-Deployment Documentation

> **Important**: Complete these steps BEFORE deployment to ensure deployed code is tracked in git.

### 3.1 Version & Changelog

- [ ] Update `package.json` version number
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Update version docs (DEVELOPMENT_PLAN.md, TRACK.md status)

### 3.2 Commit & Push

- [ ] Commit all changes: `git add . && git commit -m "release(vX.X): description"`
- [ ] Push to development: `git push origin development`

---

## 4. Deployment Execution

### 4.1 Infrastructure

```
/home/deploy/goodman/
├── docker-compose.yml    # Container orchestration
├── .env                  # Environment variables
└── project-goodman/      # Application code
```

| Container | Port | Purpose |
|-----------|------|---------|
| `goodman` | 3000 | Next.js application |
| `goodman-redis` | 6379 | Session & rate limit storage |

### 4.2 Deploy Commands

```bash
# Pull latest code
cd /home/deploy/goodman/project-goodman && git pull origin development

# Full rebuild and deploy
cd /home/deploy/goodman && docker compose up -d --build goodman

# View logs
docker logs -f goodman

# Restart without rebuild
docker compose restart goodman

# Check container status
docker ps --filter "name=goodman"
```

---

## 5. Post-Deployment Verification

### 5.1 Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 5.2 Functional Testing

| Test | Command | Expected |
|------|---------|----------|
| Health | `curl localhost:3000/api/health` | `{"status":"ok"}` |
| Sessions | `curl localhost:3000/api/sessions` | `{"sessions":[]}` |
| Auth | `curl -X POST localhost:3000/api/auth/login` | JSON response |

### 5.3 Log Monitoring (15 min recommended)

```bash
# Watch for errors
docker logs -f goodman 2>&1 | grep -i "error\|warn"

# Check Redis connection
docker logs goodman 2>&1 | grep -i "redis"
```

---

## 6. Release Finalization

> **Only after deployment verification succeeds.**

### 6.1 Post-Release Documentation

- [ ] Update `CHANGELOG.md` with release details (if not done in pre-deployment)
- [ ] Update `v*_DEVELOPMENT_PLAN.md` to mark feature as released
- [ ] Remove resolved items from `KNOWN_ISSUES.md`
- [ ] Archive completed PHASE3-5_TRACK.md tasks

### 6.2 Merge & Tag

- [ ] Merge to main: `git checkout main && git merge development && git push`
- [ ] Tag release: `git tag -a vX.X.X -m "Release notes" && git push origin vX.X.X`
- [ ] Return to development: `git checkout development`

---

## 7. Rollback Plan

### Quick Rollback

```bash
# Revert to previous commit
git checkout HEAD~1
cd /home/deploy/goodman && docker compose up -d --build goodman
```

### Database Rollback

Migrations are forward-only. For schema changes:
1. Backup data before migration
2. Test migrations on branch first
3. Use Supabase branching for major changes

---

## 8. Monitoring & Troubleshooting

### Container Health

```bash
docker stats goodman goodman-redis
```

### Service Costs

| Service | Monitor | Notes |
|---------|---------|-------|
| OpenAI | platform.openai.com/usage | Pay-as-you-go |
| Supabase | Dashboard → Usage | Storage & bandwidth |
| VPS | Provider dashboard | CPU/memory |

### Common Issues

| Issue | Solution |
|-------|----------|
| Container won't start | `docker logs goodman` |
| Redis connection refused | Verify `goodman-redis` is running |
| Database errors | Check Supabase dashboard |
| Build fails | Run `npm run build` locally first |
| Slow startup | Normal ~10s for cold start |

---

## Security Baseline

These should always be true:

- [x] Environment variables in `.env` (not in code)
- [x] Service role key server-side only
- [x] Admin password bcrypt hashed
- [x] CSRF protection on state-changing operations
- [x] Rate limiting via Redis
- [x] Security headers in next.config.ts

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v4.2 | 2026-01-13 | Added post-release documentation section (6.1) to align with global CLAUDE.md |
| v4.1 | 2026-01-08 | Fixed sequence: pre-deploy docs before deployment, post-deploy finalization after |
| v4.0 | 2026-01-08 | Reorganized as Phase 6 execution guide |
| v3.11 | 2026-01-07 | Updated for Docker/VPS |
| v2.0 | 2025-12-03 | Initial Vercel deployment |

---

*Project Goodman v4.2*
