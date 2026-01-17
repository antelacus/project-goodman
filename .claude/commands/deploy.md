---
description: Run full deployment checklist and deploy to production
---

# Deploy Command

Execute a complete pre-deployment validation and deploy to production.

## Steps

1. **Run the deployment-checker agent** to validate readiness
2. **Build the application** to verify no errors
3. **Show deployment command** for user confirmation
4. **Execute deployment** only after user approval

## Pre-Deployment Checks

Before deploying, verify:

- [ ] All TypeScript compiles without errors
- [ ] ESLint passes with 0 errors
- [ ] Unit tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Types are in sync with database
- [ ] No security vulnerabilities

## Verification Commands

```bash
npm run lint   # ESLint check (0 errors required)
npm run test   # Vitest unit tests
npm run build  # TypeScript + production build
```

> **Note**: Pre-commit hooks (Husky + lint-staged) enforce linting on commit. If the above commands fail, commits will also be blocked.

## Deployment Command

```bash
cd /home/deploy/goodman && docker compose up -d --build goodman
```

## Post-Deployment

After deployment:

```bash
# Verify container is running
docker ps | grep goodman

# Check for startup errors
docker logs --tail 100 goodman

# Health check
curl -s http://localhost:3000 | head -1
```

## Important

- **Never deploy without user confirmation**
- **Always run build first** to catch errors before Docker build
- **Check logs after deployment** for runtime errors
- **Have rollback ready** if issues occur
