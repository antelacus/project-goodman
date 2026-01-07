# Project Goodman - Deployment Checklist

**Version**: V3.11
**Last Updated**: 2026-01-07
**Target Platform**: Docker on VPS + Supabase Cloud

---

## Quick Deploy

```bash
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman
docker logs -f goodman
```

---

## Pre-Deployment Verification

### 1. Environment Variables

Ensure the following are set in `$GOODMAN_PROD_DIR/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ Yes | OpenAI API key |
| `OPENAI_MODEL` | Optional | Model name (default: gpt-4o) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key (server only) |
| `ADMIN_PASSWORD` | ✅ Yes | Bcrypt hash for admin authentication |
| `REDIS_URL` | ✅ Yes | Redis connection URL |

### 2. Build Verification

```bash
npm run build  # Should complete with 0 errors
```

### 3. Database Status

| Item | Verification Command |
|------|---------------------|
| Migrations applied | `supabase db diff` or check Supabase dashboard |
| Types in sync | `npx supabase gen types typescript` |
| RLS policies | Check Supabase → Authentication → Policies |

---

## Docker Deployment

### Infrastructure

```
$GOODMAN_PROD_DIR/
├── docker-compose.yml    # Container orchestration
├── .env                  # Environment variables
└── project-goodman/      # Application code
```

### Containers

| Container | Port | Purpose |
|-----------|------|---------|
| `goodman` | 3000 | Next.js application |
| `goodman-redis` | 6379 | Session & rate limit storage |

### Deploy Commands

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

## Post-Deployment Verification

### Health Check

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Functional Testing

| Test | Command/Action | Expected |
|------|----------------|----------|
| Health | `curl localhost:3000/api/health` | `{"status":"ok"}` |
| Auth API | `curl -X POST localhost:3000/api/auth/login` | Returns JSON response |
| Sessions | `curl localhost:3000/api/sessions` | Returns `{"sessions":[]}` |
| Documents | `curl localhost:3000/api/local-documents?sessionId=test` | Returns document list |

### Log Monitoring

```bash
# Watch for errors (15 min recommended)
docker logs -f goodman 2>&1 | grep -i "error\|warn"

# Check Redis connection
docker logs goodman 2>&1 | grep -i "redis"
```

---

## Rollback Plan

### Quick Rollback

```bash
# Revert to previous commit
git checkout HEAD~1
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman
```

### Database Rollback

Migrations are forward-only. For schema changes:
1. Backup data before migration
2. Test migrations on branch first
3. Use Supabase branching for major changes

---

## Monitoring

### Container Health

```bash
docker stats goodman goodman-redis
```

### Service Costs

| Service | Monitor | Notes |
|---------|---------|-------|
| OpenAI | platform.openai.com/usage | Pay-as-you-go |
| Supabase | Dashboard → Usage | Check storage & bandwidth |
| VPS | Provider dashboard | Monitor CPU/memory |

---

## Security Checklist

- [x] Environment variables in `.env` (not in code)
- [x] Service role key server-side only
- [x] Admin password bcrypt hashed
- [x] CSRF protection on state-changing operations
- [x] Rate limiting via Redis
- [x] Security headers in next.config.ts
- [x] RLS enabled on Supabase tables

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Container won't start | Check `docker logs goodman` |
| Redis connection refused | Verify `goodman-redis` is running |
| Database errors | Check Supabase dashboard for status |
| Build fails | Run `npm run build` locally first |
| Slow startup | Normal ~10s for cold start |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V3.11 | 2026-01-07 | Updated for Docker/VPS, removed Vercel references |
| V2.0 | 2025-12-03 | Initial Vercel deployment |

---

*Project Goodman V3.11*
