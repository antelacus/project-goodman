# v4.4 生产就绪 - Task C Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 GlitchTip + Uptime Kuma 自托管配置，并在服务端接入错误追踪（带 requestId/route 上下文，且不泄露敏感信息）。

**Architecture:** 通过独立 `docker-compose.observability.yml` 部署可观测性栈；应用端在 server-only 模块初始化错误追踪，并在 API 错误响应时上报错误（仅 5xx）。

**Tech Stack:** Docker Compose, GlitchTip (Sentry-compatible), Uptime Kuma, Next.js 15, Vitest

---

### Task 1: GlitchTip 自托管配置 (REQ-C1)

**Files:**
- Create: `docker-compose.observability.yml`
- Create: `.env.observability.example`
- Modify: `docs/OBSERVABILITY.md`

**Step 0: TDD Exception (配置/文档)**
- 说明：本任务仅涉及配置/文档，无法进行 TDD。
- 需要用户确认允许跳过 TDD（执行前确认）。

**Step 1: 创建 observability 环境变量模板**

```dotenv
# GlitchTip + Uptime Kuma Observability Environment Example
# Copy to /home/deploy/goodman/.env.observability and fill in values

# =============================================================================
# GlitchTip Core
# =============================================================================
GLITCHTIP_SECRET_KEY="your-secret-key"
GLITCHTIP_DOMAIN="https://glitchtip.your-domain.com"
GLITCHTIP_EMAIL_URL="smtp://user:pass@smtp.example.com:587"
GLITCHTIP_FROM_EMAIL="glitchtip@your-domain.com"

# =============================================================================
# GlitchTip Database/Redis
# =============================================================================
GLITCHTIP_POSTGRES_DB="glitchtip"
GLITCHTIP_POSTGRES_USER="glitchtip"
GLITCHTIP_POSTGRES_PASSWORD="your-postgres-password"
GLITCHTIP_REDIS_PASSWORD="your-redis-password"

# =============================================================================
# Uptime Kuma
# =============================================================================
UPTIME_KUMA_PORT="3002"
```

**Step 2: 创建 GlitchTip Compose 配置**

```yaml
services:
  glitchtip-postgres:
    image: postgres:15-alpine
    container_name: glitchtip-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${GLITCHTIP_POSTGRES_DB}
      POSTGRES_USER: ${GLITCHTIP_POSTGRES_USER}
      POSTGRES_PASSWORD: ${GLITCHTIP_POSTGRES_PASSWORD}
    volumes:
      - glitchtip-postgres-data:/var/lib/postgresql/data

  glitchtip-redis:
    image: redis:7-alpine
    container_name: glitchtip-redis
    restart: unless-stopped
    command: ["sh", "-c", "redis-server --requirepass \"$GLITCHTIP_REDIS_PASSWORD\""]
    volumes:
      - glitchtip-redis-data:/data

  glitchtip:
    image: glitchtip/glitchtip:latest
    container_name: glitchtip
    restart: unless-stopped
    env_file:
      - .env.observability
    environment:
      DATABASE_URL: postgres://${GLITCHTIP_POSTGRES_USER}:${GLITCHTIP_POSTGRES_PASSWORD}@glitchtip-postgres:5432/${GLITCHTIP_POSTGRES_DB}
      REDIS_URL: redis://:${GLITCHTIP_REDIS_PASSWORD}@glitchtip-redis:6379/0
      SECRET_KEY: ${GLITCHTIP_SECRET_KEY}
      PORT: 8000
      GLITCHTIP_DOMAIN: ${GLITCHTIP_DOMAIN}
      ALLOWED_HOSTS: ${GLITCHTIP_DOMAIN}
      EMAIL_URL: ${GLITCHTIP_EMAIL_URL}
      DEFAULT_FROM_EMAIL: ${GLITCHTIP_FROM_EMAIL}
      ENABLE_OPEN_USER_REGISTRATION: "false"
    ports:
      - "127.0.0.1:8001:8000"
    depends_on:
      - glitchtip-postgres
      - glitchtip-redis

  glitchtip-worker:
    image: glitchtip/glitchtip:latest
    container_name: glitchtip-worker
    restart: unless-stopped
    env_file:
      - .env.observability
    environment:
      DATABASE_URL: postgres://${GLITCHTIP_POSTGRES_USER}:${GLITCHTIP_POSTGRES_PASSWORD}@glitchtip-postgres:5432/${GLITCHTIP_POSTGRES_DB}
      REDIS_URL: redis://:${GLITCHTIP_REDIS_PASSWORD}@glitchtip-redis:6379/0
      SECRET_KEY: ${GLITCHTIP_SECRET_KEY}
      GLITCHTIP_DOMAIN: ${GLITCHTIP_DOMAIN}
      ALLOWED_HOSTS: ${GLITCHTIP_DOMAIN}
      EMAIL_URL: ${GLITCHTIP_EMAIL_URL}
      DEFAULT_FROM_EMAIL: ${GLITCHTIP_FROM_EMAIL}
    command: ./bin/run-celery.sh
    depends_on:
      - glitchtip-postgres
      - glitchtip-redis

  glitchtip-migrate:
    image: glitchtip/glitchtip:latest
    container_name: glitchtip-migrate
    env_file:
      - .env.observability
    environment:
      DATABASE_URL: postgres://${GLITCHTIP_POSTGRES_USER}:${GLITCHTIP_POSTGRES_PASSWORD}@glitchtip-postgres:5432/${GLITCHTIP_POSTGRES_DB}
      REDIS_URL: redis://:${GLITCHTIP_REDIS_PASSWORD}@glitchtip-redis:6379/0
      SECRET_KEY: ${GLITCHTIP_SECRET_KEY}
      GLITCHTIP_DOMAIN: ${GLITCHTIP_DOMAIN}
      ALLOWED_HOSTS: ${GLITCHTIP_DOMAIN}
      EMAIL_URL: ${GLITCHTIP_EMAIL_URL}
      DEFAULT_FROM_EMAIL: ${GLITCHTIP_FROM_EMAIL}
    command: ./bin/run-migrate.sh
    depends_on:
      - glitchtip-postgres
      - glitchtip-redis

volumes:
  glitchtip-postgres-data:
  glitchtip-redis-data:
```

**Step 3: 验证 Compose 语法**

Run: `docker compose -f docker-compose.observability.yml --env-file .env.observability config`
Expected: 无错误输出，返回合并后的配置

**Step 4: 文档补充（GlitchTip 部署与访问）**

在 `docs/OBSERVABILITY.md` 添加：
- 启动命令、访问地址（`http://127.0.0.1:8001`）
- 首次初始化与管理员创建说明

**Step 5: 更新 TRACK**
- 更新 `docs/versions/v4/features/production-readiness/PHASE3-5_TRACK.md` 的 Task C1 实施记录与状态

---

### Task 2: Uptime Kuma 监控配置 (REQ-C2)

**Files:**
- Modify: `docker-compose.observability.yml`
- Modify: `docs/OBSERVABILITY.md`

**Step 0: TDD Exception (配置/文档)**
- 说明：本任务仅涉及配置/文档，无法进行 TDD。
- 需要用户确认允许跳过 TDD（执行前确认）。

**Step 1: 增加 Uptime Kuma 服务**

```yaml
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "127.0.0.1:${UPTIME_KUMA_PORT}:3001"
    volumes:
      - uptime-kuma-data:/app/data
```

在 `volumes` 追加:

```yaml
  uptime-kuma-data:
```

**Step 2: 验证 Compose 语法**

Run: `docker compose -f docker-compose.observability.yml --env-file .env.observability config`
Expected: 无错误输出，返回合并后的配置

**Step 3: 文档补充（监控与告警）**

在 `docs/OBSERVABILITY.md` 添加：
- Uptime Kuma 访问地址（`http://127.0.0.1:${UPTIME_KUMA_PORT}`）
- 监控项：`/api/health` (prod/staging)
- 告警渠道配置记录（邮件/IM 方式 + 配置位置）

**Step 4: 更新 TRACK**
- 更新 `docs/versions/v4/features/production-readiness/PHASE3-5_TRACK.md` 的 Task C2 实施记录与状态

---

### Task 3: 服务端错误追踪接入 (REQ-C3)

**Files:**
- Create: `src/lib/observability/error-tracking.ts`
- Modify: `src/instrumentation.ts`
- Modify: `src/lib/security/error-handler.ts`
- Modify: `.env.staging.example`
- Test: `tests/unit/observability/error-tracking.test.ts`
- Test: `tests/unit/security/error-handler.test.ts`

**Step 1: 写入失败测试（sanitizeEvent）**

```typescript
// @vitest-environment node
import { sanitizeEvent } from '@/lib/observability/error-tracking';
import type { Event } from '@sentry/types';

const baseEvent: Event = {
  message: 'password=secret',
  request: { headers: { authorization: 'Bearer token' } },
  extra: { token: 'abc', safe: 'ok' },
  exception: {
    values: [{ value: 'Bearer token', stacktrace: { frames: [{ filename: '/home/deploy/app.js' }] } }],
  },
};

test('sanitizeEvent removes request and redacts secrets', () => {
  const sanitized = sanitizeEvent(baseEvent);

  expect(sanitized?.request).toBeUndefined();
  expect(sanitized?.message).toContain('[REDACTED]');
  expect(sanitized?.extra?.token).toBeUndefined();
  expect(sanitized?.extra?.safe).toBe('ok');
  expect(sanitized?.exception?.values?.[0]?.value).toContain('[REDACTED]');
});
```

**Step 2: 运行测试确认失败**

Run: `npm run test -- --run tests/unit/observability/error-tracking.test.ts`
Expected: FAIL（sanitizeEvent 未实现）

**Step 3: 最小实现 error-tracking 模块**

```typescript
import * as Sentry from '@sentry/node';
import type { Event } from '@sentry/types';

type ErrorContext = {
  requestId?: string;
  route?: string;
  tags?: Record<string, string>;
};

const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /supabase/i,
  /openai/i,
  /bearer/i,
  /authorization/i,
  /credential/i,
];

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'credential',
  'bearer',
  'cookie',
  'session',
];

let initialized = false;
let enabled = false;

function redact(value: string): string {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))
    ? '[REDACTED]'
    : value;
}

function sanitizeExtras(
  extras?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!extras) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extras)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));
    if (isSensitive) continue;

    sanitized[key] = typeof value === 'string' ? redact(value) : value;
  }

  return sanitized;
}

export function sanitizeEvent(event: Event): Event | null {
  if (!event) return event;

  const sanitized: Event = {
    ...event,
    request: undefined,
    user: undefined,
    extra: sanitizeExtras(event.extra),
    message: event.message ? redact(event.message) : event.message,
  };

  if (sanitized.exception?.values) {
    sanitized.exception.values = sanitized.exception.values.map((value) => ({
      ...value,
      value: value.value ? redact(value.value) : value.value,
    }));
  }

  return sanitized;
}

function isServerRuntime(): boolean {
  return typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge';
}

export function initErrorTracking(): void {
  if (initialized || !isServerRuntime()) return;
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.GLITCHTIP_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: sanitizeEvent,
  });

  initialized = true;
  enabled = true;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  if (!enabled || !isServerRuntime()) return;

  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag('requestId', context.requestId);
    if (context?.route) scope.setTag('route', context.route);
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }

    Sentry.captureException(error);
  });
}
```

**Step 4: 运行测试确认通过**

Run: `npm run test -- --run tests/unit/observability/error-tracking.test.ts`
Expected: PASS

**Step 5: 写入失败测试（createErrorResponse 调用捕获）**

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/observability/error-tracking', () => ({
  captureError: vi.fn(),
}));

import { createErrorResponse } from '@/lib/security/error-handler';
import { captureError } from '@/lib/observability/error-tracking';

test('reports server errors with requestId', () => {
  createErrorResponse(new Error('boom'), 'req_test', 500);
  expect(captureError).toHaveBeenCalledWith(expect.any(Error), { requestId: 'req_test' });
});

test('does not report client errors', () => {
  createErrorResponse(new Error('bad'), 'req_test', 400);
  expect(captureError).not.toHaveBeenCalled();
});
```

**Step 6: 运行测试确认失败**

Run: `npm run test -- --run tests/unit/security/error-handler.test.ts`
Expected: FAIL（未接入 captureError）

**Step 7: 修改 error-handler 接入 GlitchTip**

```typescript
import { captureError } from '@/lib/observability/error-tracking';

export function createErrorResponse(
  error: unknown,
  requestId: string,
  statusCode: number = 500,
  options?: { isDev?: boolean; errorType?: string; route?: string }
): Response {
  const sanitized = sanitizeError(error, requestId, options);

  if (statusCode >= 500) {
    captureError(error, { requestId, route: options?.route });
  }

  return new Response(JSON.stringify(sanitized), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  });
}
```

**Step 8: 初始化错误追踪（Instrumentation）**

```typescript
import { initErrorTracking } from '@/lib/observability/error-tracking';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initErrorTracking();
    // existing initialization...
  }
}
```

**Step 9: 更新 staging 环境变量模板**

```dotenv
# =============================================================================
# GlitchTip Error Tracking (Server Only)
# =============================================================================
GLITCHTIP_DSN="https://public-key@glitchtip.your-domain.com/1"
GLITCHTIP_ENV="staging"
```

**Step 10: 运行测试确认通过**

Run: `npm run test -- --run tests/unit/observability/error-tracking.test.ts tests/unit/security/error-handler.test.ts`
Expected: PASS

**Step 11: 更新 TRACK**
- 更新 `docs/versions/v4/features/production-readiness/PHASE3-5_TRACK.md` 的 Task C3 实施记录与状态

---

### 通用提交步骤（每个 Task 完成后）

```bash
git add <files>
git commit -m "feat(v4.4): add observability task C1"  # C1
# or
# git commit -m "feat(v4.4): add observability task C2"
# git commit -m "feat(v4.4): add observability task C3"
```
