---
name: security-review
description: Automatically checks for OWASP vulnerabilities when editing API routes, authentication code, or security-sensitive files in src/app/api/ or src/lib/security/
---

# Security Review Checklist

Apply these security checks when working with API routes or authentication code.

## OWASP Top 10 Checks

### 1. Injection Prevention

```typescript
// CORRECT - Supabase parameterized queries
const { data } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId);

// WRONG - string concatenation
const { data } = await supabase.rpc('search', {
  query: `SELECT * FROM documents WHERE id = '${documentId}'` // SQL Injection!
});
```

### 2. XSS Prevention

```typescript
// CORRECT - React auto-escapes
return <div>{userInput}</div>;

// DANGER - only use with sanitized HTML
return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
// Always sanitize first!
```

### 3. Input Validation (Required for All APIs)

```typescript
// CORRECT - Zod validation
import { chatMessageSchema } from '@/lib/validation/api-schemas';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return createErrorResponse('Invalid input', 400);
  }
  // Use parsed.data
}

// WRONG - no validation
export async function POST(request: Request) {
  const { question } = await request.json(); // Untrusted!
}
```

### 4. Authentication Checks

```typescript
// Admin operations MUST verify password
import { verifyAdminPassword } from '@/lib/security/admin-auth';

const isValid = await verifyAdminPassword(password);
if (!isValid) {
  return createErrorResponse('Unauthorized', 401);
}
```

### 5. Sensitive Data Logging

```typescript
// CORRECT - log outcomes, not secrets
console.log('[AUTH] Login attempt', { userId, success: true });

// WRONG - logging secrets
console.log('[AUTH] Login', { password, apiKey }); // Never!
```

### 6. Rate Limiting

All public API endpoints should use rate limiting:

```typescript
import { checkRateLimit } from '@/lib/security/rate-limiter';

const { allowed, remaining } = await checkRateLimit(clientIp);
if (!allowed) {
  return createErrorResponse('Too many requests', 429);
}
```

### 7. CSRF Protection

State-changing operations should validate origin:

```typescript
import { validateCsrfToken } from '@/lib/security/csrf';

const token = request.headers.get('x-csrf-token');
if (!validateCsrfToken(token)) {
  return createErrorResponse('Invalid CSRF token', 403);
}
```

## Financial Data Specific

- Never log financial figures in production
- Audit trail required for document modifications
- Use `crypto.timingSafeEqual` for token comparisons
- Temporary uploads must be cleaned up (check pg_cron job)

## Error Response Pattern

Always use the standard error response helper:

```typescript
import { createErrorResponse } from '@/lib/api-utils';

// Returns consistent format: { success: false, error: string }
return createErrorResponse('User-friendly message', 400);
```

## Key Security Files

- `src/lib/security/admin-auth.ts` - Admin authentication
- `src/lib/security/rate-limiter.ts` - IP-based rate limiting
- `src/lib/security/csrf.ts` - CSRF token validation
- `src/lib/security/audit-logger.ts` - Security event logging
- `src/lib/validation/api-schemas.ts` - Zod input schemas
