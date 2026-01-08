# Project Goodman - Deployment Checklist

**Version**: v4.0
**Last Updated**: 2026-01-08
**Target Platform**: Docker on VPS + Supabase Cloud

> This checklist covers the complete Phase 6 deployment process.
> Referenced by global `~/.claude/CLAUDE.md`.

---

## Quick Reference

```bash
# Deploy
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman

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

Verify in `$GOODMAN_PROD_DIR/.env`:

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

## 3. Deployment Execution

### 3.1 Infrastructure

```
$GOODMAN_PROD_DIR/
├── docker-compose.yml    # Container orchestration
├── .env                  # Environment variables
└── project-goodman/      # Application code
```

| Container | Port | Purpose |
|-----------|------|---------|
| `goodman` | 3000 | Next.js application |
| `goodman-redis` | 6379 | Session & rate limit storage |

### 3.2 Deploy Commands

```bash
# Full rebuild and deploy
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman

# View logs
docker logs -f goodman

# Restart without rebuild
docker compose restart goodman

# Check container status
docker ps --filter "name=goodman"
```

---

## 4. Post-Deployment Verification

### 4.1 Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 4.2 Functional Testing

| Test | Command | Expected |
|------|---------|----------|
| Health | `curl localhost:3000/api/health` | `{"status":"ok"}` |
| Sessions | `curl localhost:3000/api/sessions` | `{"sessions":[]}` |
| Auth | `curl -X POST localhost:3000/api/auth/login` | JSON response |

### 4.3 Log Monitoring (15 min recommended)

```bash
# Watch for errors
docker logs -f goodman 2>&1 | grep -i "error\|warn"

# Check Redis connection
docker logs goodman 2>&1 | grep -i "redis"
```

---

## 5. Post-Deployment Documentation

- [ ] Update `CHANGELOG.md` with release notes
- [ ] Update `package.json` version
- [ ] Update version docs (DEVELOPMENT_PLAN.md, TRACK.md status)
- [ ] Commit all changes
- [ ] Push to remote: `git push origin development`
- [ ] Merge to main: `git checkout main && git merge development && git push`
- [ ] Tag release: `git tag -a vX.X.X -m "Release notes" && git push origin vX.X.X`

---

## 6. Rollback Plan

### Quick Rollback

```bash
git checkout HEAD~1
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman
```

### Database Rollback

Migrations are forward-only. For schema changes:
1. Backup data before migration
2. Test migrations on branch first
3. Use Supabase branching for major changes

---

## 7. Monitoring & Troubleshooting

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
| v4.0 | 2026-01-08 | Reorganized as Phase 6 execution guide |
| V3.11 | 2026-01-07 | Updated for Docker/VPS |
| V2.0 | 2025-12-03 | Initial Vercel deployment |

---

*Project Goodman v4.0*
