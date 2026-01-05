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
- [ ] No ESLint warnings
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Types are in sync with database
- [ ] No security vulnerabilities

## Build Command

```bash
npm run build
```

## Deployment Command

```bash
cd $GOODMAN_PROD_DIR && docker compose up -d --build goodman
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
