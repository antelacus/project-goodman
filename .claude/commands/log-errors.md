---
description: Fetch and analyze recent Docker logs for errors
---

# Log Errors Command

Fetch recent Docker logs from the goodman container and analyze for errors.

## Process

1. **Fetch recent logs** from the goodman container
2. **Filter for errors** (ERROR, Error, error, Exception, FATAL)
3. **Analyze patterns** to identify root causes
4. **Suggest fixes** for common issues

## Commands

### Fetch Logs

```bash
# Last 200 lines
docker logs --tail 200 goodman

# Last 10 minutes
docker logs --since 10m goodman

# Follow live (for debugging)
docker logs -f goodman
```

### Filter Errors

```bash
# Only error lines
docker logs --tail 500 goodman 2>&1 | grep -i -E "(error|exception|fatal|failed)"
```

## Common Error Patterns

### Database Connection
```
Error: Connection refused
Fix: Check Redis/Supabase connectivity, verify env vars
```

### Missing Environment Variable
```
Error: OPENAI_API_KEY is not defined
Fix: Verify .env.local has all required variables
```

### Build Errors
```
Error: Module not found
Fix: Rebuild with docker compose up -d --build goodman
```

### Memory Issues
```
Error: JavaScript heap out of memory
Fix: Increase Docker memory limit or optimize code
```

## Usage

```
/log-errors           # Analyze last 200 lines
/log-errors 500       # Analyze last 500 lines
/log-errors $ARGUMENTS
```

## Output

Report showing:
- Error count and types
- Most frequent errors
- Timeline of errors
- Suggested fixes for each error type

## Related Commands

```bash
# Check container status
docker ps | grep goodman

# Check container resource usage
docker stats goodman --no-stream

# Restart container
docker compose restart goodman
```
