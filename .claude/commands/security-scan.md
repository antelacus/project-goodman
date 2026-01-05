---
description: Run security audit on the codebase to find vulnerabilities
---

# Security Scan Command

Run a comprehensive security audit using the security-auditor agent.

## Scan Scope

By default, scan these areas:

1. **API Routes** (`src/app/api/`) - Input validation, auth, injection
2. **Security Module** (`src/lib/security/`) - Auth, rate limiting, CSRF
3. **Database Queries** - SQL injection, data exposure
4. **File Uploads** - Validation, storage security
5. **Environment** - Secret exposure, configuration

## Usage

```
/security-scan              # Full scan
/security-scan api          # Scan only API routes
/security-scan $ARGUMENTS   # Scan specific path or area
```

## Checks Performed

### OWASP Top 10
- [ ] Injection (SQL, command, code)
- [ ] Broken Authentication
- [ ] Sensitive Data Exposure
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Security Misconfiguration
- [ ] Insecure Dependencies

### Project-Specific
- [ ] Zod validation on all API inputs
- [ ] Admin operations use `verifyAdminPassword()`
- [ ] No secrets in logs
- [ ] Rate limiting enabled
- [ ] CSP headers configured

## Output

The scan produces a security report with:
- Critical vulnerabilities (P0)
- High risk issues (P1)
- Medium risk issues (P2)
- Low risk issues (P3)
- Passed security checks

## Follow-Up

After the scan:
1. Address all P0 issues immediately
2. Fix P1 issues before deployment
3. Create tickets for P2/P3 issues
