# v4.3 项目基础增强 - Phase 2 设计文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 项目基础增强 (Foundation Enhancement) |
| **版本** | v4.3 |
| **状态** | Phase 2 - 设计完成 |
| **Phase 1 文档** | [PHASE1_REQ.md](./PHASE1_REQ.md) |

---

## 设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| ESLint `any` 类型修复 | 优先使用库类型（Supabase、OpenAI） | 减少自定义类型维护负担 |
| 骨架屏颜色 | 品牌黄色调（bg-yellow-100） | 与 Goodman 品牌一致 |
| Error Boundary 日志 | UI 恢复 + console.error | 便于调试，不影响用户体验 |
| expr-eval 替代 | mathjs | 活跃维护，功能丰富，API 兼容性好 |
| xlsx 替代 | exceljs | 活跃维护，异步 API，安全性更好 |
| CI/CD 工具 | GitHub Actions | 原生集成，无额外成本 |
| LangSmith 集成 | 环境变量启用 | 生产环境可灵活开关 |

---

## A. 文档更新

### A1: 文档系统审查

**方法**：审查现有文档结构，提出简化建议。

**当前状态**：

- 项目目录下存在大量 markdown 文件
- 文件分散在不同目录之下
- 每次版本更新需同步多个文档
- 文档之间存在内容重叠、冲突、不一致等情况

**输出**：在 PHASE3-5_TRACK.md 中记录建议。

### A2: 更新过时的、多余的文档或其内容

---

## B. 代码质量

### B1: Vitest 测试框架

**新文件**：`vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: true
  }
})
```

**package.json 变更**：

```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "@vitejs/plugin-react": "^4.x",
    "vite-tsconfig-paths": "^5.x",
    "jsdom": "^25.x"
  },
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### B2: Husky + lint-staged

**新文件**：`.husky/pre-commit`

```bash
#!/bin/sh
npx lint-staged
```

**package.json 变更**：

```json
{
  "devDependencies": {
    "husky": "^9.x",
    "lint-staged": "^15.x"
  },
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "bash -c 'npx tsc --noEmit'"]
  }
}
```

### B3: ESLint 错误修复

**当前状态**：65 个错误，1 个警告

**高优先级文件**：

| 文件 | 错误数 | 主要问题 |
|------|--------|----------|
| `src/lib/extraction/structured.ts` | 13 | 未使用变量、`any` 类型 |
| `src/app/api/admin/upload-database-document/route.ts` | 11 | 未使用变量、`any` 类型 |
| `src/app/api/chat/stream/route.ts` | 5 | 未使用变量 |
| `src/hooks/useStreamingChat.ts` | 3+1 | Hook 依赖问题 |

**修复策略**：

1. 移除未使用的 imports/variables
2. 使用库类型替换 `any`（Supabase、OpenAI 等）
3. 修复 `prefer-const` 违规
4. 修复 React hooks 依赖

**最终步骤**：移除 `next.config.ts` 中的 `ignoreDuringBuilds: true`

---

## C. 数据库维护

### C1: 重新生成 TypeScript 类型

**命令**：

```bash
npx supabase gen types typescript --project-id mxybrzuxlsioqwsxyjeb > src/lib/database/types.ts
```

**验证**：确保输出包含 `reports` 表定义。

### C2: 审查未使用索引

> **来源**: TD-009

**步骤**：

1. 运行 Supabase 性能顾问获取索引使用情况
2. 分析 23 个未使用索引
3. 决策：保留、删除、或标记为"设计需要"
4. 在 TRACK 中记录决策及理由

**决策选项**：

| 类型 | 处理方式 |
|------|----------|
| 确实无用 | 创建迁移删除 |
| 低频使用但必要 | 保留并文档化 |
| 未来需要 | 保留并添加注释 |

### C3: 处理 RPC 警告

> **来源**: TD-011

**问题**：4 个函数有 mutable search_path 警告

**解决方案**：创建迁移，为每个函数添加：

```sql
ALTER FUNCTION function_name SET search_path = public;
```

**验证**：运行 `get_advisors` 确认警告已消除。

### C4: 文档化 RLS 设计决策

> **来源**: TD-012, TD-013

**问题**：

- TD-012: `users` 和 `guest_activity` 表未启用 RLS
- TD-013: 9 个表有 `USING(true)` 宽松策略

**这些都是设计决策，需要文档化而非修复。**

**输出位置**：`.claude/rules/code-conventions.md` 添加数据库安全部分

**文档模板**：

```markdown
## Database Security (RLS Design Decisions)

### Tables Without RLS (by design)
| Table | Reason |
|-------|--------|
| users | Server-only access via service role |
| guest_activity | Anonymous tracking, no user data |

### Tables with USING(true) (by design)
| Table | Reason |
|-------|--------|
| financial_data | Read-only demo data, no user-specific content |
| ... | ... |
```

---

## D. 页面文案更新

### D1: About 页面修复

**文件**：`src/app/(workspace)/about/page.tsx`

| 行号 | 当前值 | 目标值 |
|------|--------|--------|
| 25 | "GPT-5-mini" | "GPT-4o" |
| 59 | "V3.7 (Phase 1)" | "V4.2.1" |

### D2: 修复报告生成时间记录

> **来源**: TD-008

**问题**：`reports` 表中的 `generation_time_ms` 字段未填充

**位置**：报告生成工具 `src/lib/tools/generate-report.ts`

**修复方案**：

```typescript
const startTime = Date.now();

// ... 报告生成逻辑 ...

const generationTimeMs = Date.now() - startTime;

// 保存报告时包含 generation_time_ms
await supabase.from('reports').insert({
  // ... 其他字段 ...
  generation_time_ms: generationTimeMs,
});
```

**验证**：

1. 生成新报告
2. 查询 `reports` 表确认 `generation_time_ms` 有值

---

## E. UI/UX 改进

### E1: 侧边栏会话同步

**问题**：新建聊天后，侧边栏不会立即显示新会话。

**解决方案架构**：

```
┌─────────────────────┐     refreshSessions()     ┌──────────────────┐
│   ChatWorkspace     │ ─────────────────────────►│  SidebarProvider │
│                     │                           │                  │
│  sessionId 变化时    │                           │  refreshTrigger  │
│  调用 refreshSessions│                           │  状态变化        │
└─────────────────────┘                           └────────┬─────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │     Sidebar      │
                                                  │                  │
                                                  │  监听 refreshTrigger │
                                                  │  重新获取会话列表 │
                                                  └──────────────────┘
```

**文件变更**：

1. **SidebarProvider.tsx**：

```typescript
interface SidebarContextType {
  // 现有字段...
  refreshSessions: () => void;
}

const [refreshTrigger, setRefreshTrigger] = useState(0);
const refreshSessions = useCallback(() => {
  setRefreshTrigger(prev => prev + 1);
}, []);
```

1. **Sidebar.tsx**：

```typescript
const { refreshTrigger } = useSidebar();

useEffect(() => {
  fetchSessions();
}, [refreshTrigger]);
```

1. **ChatWorkspace.tsx**：

```typescript
const { refreshSessions } = useSidebar();

useEffect(() => {
  if (sessionId) {
    refreshSessions();
  }
}, [sessionId, refreshSessions]);
```

### E2: 过程日志来源链接

**问题**：点击来源链接导航到 `/documents` 页面，中断工作流。

**解决方案**：直接在新标签页打开 PDF 预览。

**文件**：`src/components/chat/ProcessLog.tsx`

**变更**：

```typescript
// 之前
const href = source.fileUrl || (source.documentId ? `/documents?id=${source.documentId}` : '#');

// 之后
const href = source.fileUrl
  || (source.documentId ? `/api/documents/pdf-preview?id=${source.documentId}` : '#');
```

**说明**：PDF 预览 API 已存在，直接在浏览器中打开。

### E3: 骨架屏加载组件

**新文件**：`src/components/ui/Skeleton.tsx`

```typescript
import { cn } from '@/lib/utils';

// 基础骨架组件（品牌黄色调）
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-yellow-100 rounded", className)} />
  );
}

// 文本骨架
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

// 会话列表骨架
export function SkeletonSessionList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// 消息骨架
export function SkeletonMessage() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}
```

**使用位置**：

- `ChatWorkspace.tsx` - 消息加载时
- `Sidebar.tsx` - 会话列表加载时
- `DocumentSelectModal.tsx` - 文档列表加载时

---

## F. 健壮性与可访问性

### F1: Error Boundary 组件

> **重要性**：此功能为关键优先项。

**Next.js 错误边界策略**：

| 层级 | 机制 | 用途 |
|------|------|------|
| **Client Components** | React ErrorBoundary (class) | 捕获客户端渲染错误（聊天界面最重要） |
| **Server Components** | Next.js `error.tsx` | 捕获服务端渲染/异步组件错误 |
| **Global** | `global-error.tsx` | 根布局错误的最终兜底 |

**新文件**：

1. `src/components/providers/ErrorBoundary.tsx` - 客户端错误边界
2. `src/app/(workspace)/error.tsx` - 工作区服务端错误
3. `src/app/global-error.tsx` - 全局错误兜底

**客户端 ErrorBoundary**：`src/components/providers/ErrorBoundary.tsx`

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">
            页面出现问题
          </h2>
          <p className="text-neutral-600 mb-4 max-w-md">
            抱歉，页面遇到了意外错误。请尝试刷新页面或重试操作。
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-neutral-900 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 p-4 bg-red-50 text-red-700 text-xs text-left max-w-full overflow-auto rounded">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
```

**服务端 error.tsx**：`src/app/(workspace)/error.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WorkspaceError] Server error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
      <h2 className="text-lg font-semibold text-neutral-900 mb-2">
        加载出现问题
      </h2>
      <p className="text-neutral-600 mb-4 max-w-md">
        抱歉，页面加载时遇到错误。请尝试重新加载。
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-neutral-900 rounded-lg transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        重新加载
      </button>
    </div>
  );
}
```

**全局 error**：`src/app/global-error.tsx`

```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">出现严重错误</h2>
          <button onClick={reset} className="px-4 py-2 bg-yellow-400 rounded">
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
```

**集成位置**：

- `src/app/(workspace)/layout.tsx` - 包裹客户端 ErrorBoundary
- `src/app/(workspace)/error.tsx` - 自动捕获服务端错误
- `src/app/global-error.tsx` - 根布局错误兜底

### F2-F4: 模态框可访问性 Hook

**新文件**：`src/hooks/useModalAccessibility.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export function useModalAccessibility({
  isOpen,
  onClose,
  initialFocusRef,
}: UseModalAccessibilityOptions) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 保存并恢复焦点
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 设置初始焦点
      const focusTarget = initialFocusRef?.current || modalRef.current;
      setTimeout(() => focusTarget?.focus(), 0);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen, initialFocusRef]);

  // Escape 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 焦点陷阱
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // 点击外部关闭
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return {
    modalRef,
    handleBackdropClick,
    ariaProps: {
      role: 'dialog' as const,
      'aria-modal': true,
      tabIndex: -1,
    },
  };
}
```

**应用到的模态框**：

- `ExtractionModal.tsx`
- `PasswordModal.tsx`
- `DocumentSelectModal.tsx`

**移动端视口处理**：

```typescript
// 模态框内容容器
className="max-h-[85dvh] overflow-y-auto"
```

---

## G. 测试基础设施

> **同时解决**: TD-006（测试覆盖不完整）、TD-010（部分测试脚本已过时）

### G1: 单元测试

**目标**：验证 Vitest 配置有效，建立测试模式，清理过时脚本，扩展关键模块覆盖。

**步骤 1：审查并清理过时脚本**

检查 `tests/` 目录中的现有脚本，移除或更新无法运行的测试。

**测试文件结构**：

```
tests/
├── unit/
│   ├── financial/
│   │   └── preset-functions.test.ts
│   ├── utils/
│   │   └── utils.test.ts
│   └── validation/
│       └── api-schemas.test.ts
└── setup.ts (如需要)
```

**财务计算测试**：`tests/unit/financial/preset-functions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCurrentRatio, calculateDebtToEquityRatio } from '@/lib/financial/preset-functions';

describe('财务指标计算', () => {
  describe('流动比率', () => {
    it('正常计算', () => {
      expect(calculateCurrentRatio(200, 100)).toBe(2.0);
    });

    it('分母为零返回 0', () => {
      expect(calculateCurrentRatio(200, 0)).toBe(0);
    });
  });

  describe('资产负债率', () => {
    it('正常计算', () => {
      expect(calculateDebtToEquityRatio(100, 200)).toBe(0.5);
    });
  });
});
```

**工具函数测试**：`tests/unit/utils/utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { cn, formatNumber } from '@/lib/utils';

describe('工具函数', () => {
  describe('cn (classnames)', () => {
    it('合并类名', () => {
      expect(cn('a', 'b')).toBe('a b');
    });

    it('条件类名', () => {
      expect(cn('a', false && 'b', 'c')).toBe('a c');
    });
  });
});
```

---

## H. 安全审计

### H1: 依赖安全检查

**步骤**：

1. 运行 `npm audit`
2. 分析高危/严重漏洞
3. 根据可行性修复或记录为已接受风险

**审计输出格式**：

```
┌───────────────┬────────────────────────────┐
│ 严重性        │ 数量                        │
├───────────────┼────────────────────────────┤
│ Critical      │ 0                          │
│ High          │ 0                          │
│ Moderate      │ x                          │
│ Low           │ x                          │
└───────────────┴────────────────────────────┘
```

### H2: 代码安全审查

**检查清单**：

- [ ] 认证：密码哈希（bcrypt）、会话管理（HttpOnly cookies）
- [ ] 授权：Admin 路由保护、角色检查
- [ ] 输入验证：所有 API 路由使用 Zod
- [ ] 输出编码：React 自动 XSS 防护
- [ ] 敏感数据：日志不含 tokens/passwords

### H3: 安全实践文档

在 `CLAUDE.md` 或 `.claude/rules/` 添加安全部分：

```markdown
## Security Practices

- Passwords: bcrypt hashing (cost factor 12)
- Sessions: HttpOnly cookies, Redis storage
- API Validation: Zod schemas on all routes
- Admin Auth: Password verification via /api/auth/verify-password
- Rate Limiting: Redis-based, per-IP limits
```

---

## I. 基础日志设施

### I1: 结构化日志工具

**新文件**：`src/lib/logging/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog('debug')) console.debug(this.format('debug', message, context));
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog('info')) console.info(this.format('info', message, context));
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog('warn')) console.warn(this.format('warn', message, context));
  }

  error(message: string, context?: LogContext) {
    if (this.shouldLog('error')) console.error(this.format('error', message, context));
  }
}

export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

// 请求日志助手
export function logRequest(
  requestId: string,
  method: string,
  route: string,
  status: number,
  duration: number
) {
  logger.info(`${method} ${route} ${status}`, {
    requestId,
    route,
    duration,
  });
}
```

### I2: API 路由集成示例

```typescript
// src/app/api/chat/stream/route.ts
import { logger, logRequest } from '@/lib/logging/logger';
import { generateRequestId } from '@/lib/security';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  logger.info('Chat stream started', { requestId });

  try {
    // ... 处理逻辑 ...

    logRequest(requestId, 'POST', '/api/chat/stream', 200, Date.now() - startTime);
    return response;
  } catch (error) {
    logger.error('Chat stream error', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    logRequest(requestId, 'POST', '/api/chat/stream', 500, Date.now() - startTime);
    throw error;
  }
}
```

**敏感数据过滤**：

```typescript
// 永不记录的字段
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization'];

function sanitizeContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).filter(
      ([key]) => !SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))
    )
  );
}
```

---

## J. 性能基线

> **来源**: TD-005（技术债务）

### J1: 打包分析器

**安装依赖**：

```bash
npm install -D @next/bundle-analyzer
```

**修改 `next.config.ts`**：

```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// 现有配置...
export default withBundleAnalyzer(nextConfig);
```

**package.json 脚本**：

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

### J2: API 响应时间追踪

**与 I1 日志设施整合**：

在 `logger.ts` 中添加：

```typescript
export function logRequest(
  requestId: string,
  method: string,
  route: string,
  status: number,
  durationMs: number
) {
  logger.info(`${method} ${route} ${status} ${durationMs}ms`, {
    requestId,
    route,
    duration: durationMs,
  });
}
```

**使用方式**（在 API 路由中）：

```typescript
const startTime = Date.now();
// ... 处理逻辑 ...
logRequest(requestId, 'POST', '/api/chat/stream', 200, Date.now() - startTime);
```

### J3: Web Vitals 组件

**新文件**：`src/components/providers/WebVitals.tsx`

```typescript
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // 仅在开发环境或生产环境首次加载时记录
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebVitals]', metric.name, Math.round(metric.value));
    }

    // 生产环境：可选发送到分析服务
    // 目前仅建立基线，console.log 记录即可
  });

  return null;
}
```

**集成到 layout.tsx**：

```typescript
import { WebVitals } from '@/components/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

**基线指标目标**（参考 Google 标准）：

| 指标 | 良好 | 需改进 | 差 |
|------|------|--------|-----|
| LCP (Largest Contentful Paint) | ≤2.5s | ≤4s | >4s |
| FID (First Input Delay) | ≤100ms | ≤300ms | >300ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 |

---

## K. 健康检查端点

> **来源**: TD-007

### K1: 健康检查 API

**新文件**：`src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/database/supabase';
import { getRedisClient } from '@/lib/database/redis';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; latency?: number };
    redis: { status: 'ok' | 'error' | 'skipped'; latency?: number };
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const startTime = Date.now();
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'error' },
    redis: { status: 'skipped' },
  };

  // 检查数据库连接
  try {
    const dbStart = Date.now();
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: 'error' };
  }

  // 检查 Redis 连接（如果可用）
  try {
    const redis = await getRedisClient();
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      checks.redis = {
        status: 'ok',
        latency: Date.now() - redisStart,
      };
    }
  } catch {
    checks.redis = { status: 'error' };
  }

  // 确定整体状态
  const allOk = checks.database.status === 'ok' &&
    (checks.redis.status === 'ok' || checks.redis.status === 'skipped');
  const status = allOk ? 'healthy' : checks.database.status === 'ok' ? 'degraded' : 'unhealthy';

  return NextResponse.json({
    status,
    version: process.env.npm_package_version || '4.3.0',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: status === 'unhealthy' ? 503 : 200,
  });
}
```

**验证**：

1. `curl http://localhost:3000/api/health`
2. 确认返回状态码 200 和 JSON 响应
3. 停止数据库后确认返回 503

---

## L. CI/CD 流水线

> **来源**: TD-004

### L1: GitHub Actions 工作流

**新文件**：`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [development]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Test
        run: npm run test -- --run

      - name: Security audit
        run: npm audit --audit-level=high

      - name: Build
        run: npm run build
```

**新文件**：`.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /home/deploy/goodman
            git pull origin main
            docker compose up -d --build
            sleep 10
            curl -f http://localhost:3000/api/health || exit 1
```

**所需 Secrets**：

| Secret | 说明 |
|--------|------|
| `DEPLOY_HOST` | 生产服务器 IP |
| `DEPLOY_USER` | SSH 用户名（deploy） |
| `DEPLOY_KEY` | SSH 私钥 |

---

## M. 依赖安全修复 - expr-eval

> **来源**: TD-014

### M1: mathjs 迁移

**依赖变更**：

```bash
npm uninstall expr-eval
npm install mathjs
```

**API 映射**：

| expr-eval | mathjs |
|-----------|--------|
| `new Parser()` | `import { evaluate } from 'mathjs'` |
| `parser.evaluate(expr, scope)` | `evaluate(expr, scope)` |
| `parser.parse(expr).evaluate(scope)` | `evaluate(expr, scope)` |

**主要修改文件**：`src/lib/financial/preset-functions.ts`

```typescript
// 之前
import { Parser } from 'expr-eval';
const parser = new Parser();
const result = parser.evaluate(formula, { a: 100, b: 50 });

// 之后
import { evaluate } from 'mathjs';
const result = evaluate(formula, { a: 100, b: 50 });
```

**打包体积考虑**：

mathjs 完整包约 150KB（gzipped ~50KB）。可考虑按需导入：

```typescript
import { create, evaluateDependencies } from 'mathjs';
const { evaluate } = create({ evaluateDependencies });
```

**验证**：

1. 所有财务计算功能正常工作
2. 运行财务计算测试
3. `npm audit` 不再报告 expr-eval 漏洞

---

## N. 依赖安全修复 - xlsx

> **来源**: TD-015

### N1: exceljs 迁移

**依赖变更**：

```bash
npm uninstall xlsx
npm install exceljs
```

**API 映射**：

| xlsx (同步) | exceljs (异步) |
|-------------|----------------|
| `XLSX.read(buffer)` | `await workbook.xlsx.load(buffer)` |
| `XLSX.utils.sheet_to_json(sheet)` | 手动遍历 `worksheet.eachRow()` |
| `workbook.Sheets[sheetName]` | `workbook.getWorksheet(sheetName)` |

**主要修改文件**：

1. `src/lib/extraction/structured.ts`
2. `src/app/api/admin/upload-database-document/route.ts`

**迁移示例**：

```typescript
// 之前 (xlsx)
import * as XLSX from 'xlsx';

function parseExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // REASON: XLSX returns unknown[], cast needed for row/cell operations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  return data;
}

// 之后 (exceljs)
import ExcelJS from 'exceljs';

async function parseExcel(buffer: Buffer): Promise<(string | number | null)[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  const data: (string | number | null)[][] = [];
  worksheet.eachRow((row, rowNumber) => {
    const rowData: (string | number | null)[] = [];
    row.eachCell((cell, colNumber) => {
      rowData[colNumber - 1] = cell.value as string | number | null;
    });
    data[rowNumber - 1] = rowData;
  });

  return data;
}
```

**注意事项**：

- exceljs API 是异步的，需要更新调用链
- `.xls` 格式支持有限（exceljs 主要支持 `.xlsx`）
- 如需 `.xls` 支持，可保留 xlsx 仅用于 .xls 或提示用户转换格式

**验证**：

1. Excel 文件上传和解析功能正常
2. 测试 .xlsx 文件处理
3. `npm audit` 不再报告 xlsx 漏洞

---

## O. 框架升级 - Next.js

> **来源**: TD-016

### O1: Next.js 15.5+ 升级

**升级命令**：

```bash
npm install next@latest react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest
```

**升级检查清单**：

1. 查阅 [Next.js 15.5 Release Notes](https://nextjs.org/blog)
2. 检查 `next.config.ts` 配置兼容性
3. 验证 App Router 行为
4. 验证 Server Actions
5. 验证中间件

**潜在破坏性变更处理**：

| 区域 | 检查项 |
|------|--------|
| `next.config.ts` | 配置选项是否已弃用 |
| Server Components | 异步组件签名 |
| Route Handlers | Request/Response API |
| Middleware | 匹配器语法 |

**验证步骤**：

```bash
# 1. 升级依赖
npm install next@latest

# 2. 清理缓存
rm -rf .next

# 3. 构建测试
npm run build

# 4. 运行测试
npm run test

# 5. 手动验证关键页面
# - 首页
# - 聊天页面
# - 文档页面
# - 管理页面
```

---

## P. API 验证完善

> **来源**: TD-017

### P1: 添加缺失的 Zod Schemas

**需要添加验证的路由**：

| 路由 | 当前状态 | 需要的 Schema |
|------|----------|---------------|
| `/api/quick-actions/extract` | 内联检查 | `extractRequestSchema` |
| `/api/documents/upload-temp` | 无运行时验证 | `uploadTempSchema` |
| `/api/chat/route.ts` | 简单 if 检查 | `chatRequestSchema` |

**新增到 `src/lib/validation/api-schemas.ts`**：

```typescript
import { z } from 'zod';

// 提取请求
export const extractRequestSchema = z.object({
  file: z.instanceof(File).optional(),
  fileType: z.enum(['pdf', 'xlsx', 'xls', 'docx']),
  extractionType: z.enum(['structured', 'unstructured']),
});

// 临时上传请求
export const uploadTempSchema = z.object({
  file: z.instanceof(File),
  purpose: z.enum(['extraction', 'document']).optional(),
});

// 聊天请求
export const chatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空'),
  sessionId: z.string().uuid().optional(),
});
```

**路由更新示例**：

```typescript
// src/app/api/chat/route.ts
import { chatRequestSchema } from '@/lib/validation/api-schemas';
import { createErrorResponse } from '@/lib/security';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = chatRequestSchema.safeParse(body);
  if (!result.success) {
    return createErrorResponse(
      result.error.errors[0].message,
      400
    );
  }

  const { message, sessionId } = result.data;
  // ... 处理逻辑
}
```

---

## Q. Agent 可观测性 - LangSmith

> **来源**: TD-003

### Q1: LangSmith 集成

**依赖安装**：

```bash
npm install langsmith
```

**环境变量**（添加到 `.env.example`）：

```bash
# LangSmith Configuration (optional)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your-api-key
LANGCHAIN_PROJECT=goodman-production
```

**集成方式**：

LangGraph 自动检测环境变量并启用追踪，无需代码修改。

**可选：自定义 span**：

```typescript
import { traceable } from 'langsmith/traceable';

// 包装关键函数以添加自定义追踪
const searchDocuments = traceable(
  async (query: string) => {
    // ... 搜索逻辑
  },
  { name: 'search_documents' }
);
```

**生产环境配置**：

```typescript
// 条件启用追踪
const enableTracing = process.env.LANGCHAIN_TRACING_V2 === 'true';

// Docker 环境变量
// docker-compose.yml
environment:
  - LANGCHAIN_TRACING_V2=${LANGCHAIN_TRACING_V2:-false}
  - LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:-}
  - LANGCHAIN_PROJECT=${LANGCHAIN_PROJECT:-goodman}
```

**验证**：

1. 设置环境变量
2. 运行 Agent 对话
3. 在 LangSmith 控制台验证追踪可见
4. 确认 Token 使用量显示

---

## 实现顺序

| 优先级 | 任务 | 依赖 | 解决的 TD | 状态 |
|--------|------|------|-----------|------|
| 1 | A1-A2: 文档更新 | 无 | - | ✅ 完成 |
| 2 | B1-B3: 代码质量 | 无 | - | ✅ 完成 |
| 3 | C1-C4: 数据库维护 | 无 | TD-009, TD-011, TD-012, TD-013 | ⏳ 待办 |
| 4 | D1-D2: 页面文案 | 无 | TD-008 | ⏳ 待办 |
| 5 | E1-E3: UI/UX 改进 | 无 | - | ✅ 完成 |
| 6 | F1-F4: 健壮性/可访问性 | 无 | - | ✅ 完成 |
| 7 | G1: 测试基础设施 | B1 (Vitest) | TD-006, TD-010 | ✅ 完成 |
| 8 | H1-H3: 安全审计 | 无 | TD-012, TD-013 | ✅ 完成 |
| 9 | I1-I2: 基础日志 | 无 | - | ✅ 完成 |
| 10 | J1-J3: 性能基线 | I1 (日志设施) | TD-005 | ✅ 完成 |
| 11 | K1: 健康检查端点 | 无 | TD-007 | ✅ 完成 |
| 12 | L1: CI/CD 流水线 | K1 (健康检查) | TD-004 | ⏳ 待办 |
| 13 | M1: expr-eval → mathjs | G1 (测试) | TD-014 | ⏳ 待办 |
| 14 | N1: xlsx → exceljs | G1 (测试) | TD-015 | ⏳ 待办 |
| 15 | O1: Next.js 升级 | M1, N1 | TD-016 | ⏳ 待办 |
| 16 | P1: API Zod 验证 | 无 | TD-017 | ⏳ 待办 |
| 17 | Q1: LangSmith 集成 | 无 | TD-003 | ⏳ 待办 |

---

## 文件清单

### 新建文件

| 文件 | 用途 | 状态 |
|------|------|------|
| `vitest.config.ts` | 测试框架配置 | ✅ 完成 |
| `.husky/pre-commit` | 预提交钩子 | ✅ 完成 |
| `src/components/ui/Skeleton.tsx` | 骨架屏组件 | ✅ 完成 |
| `src/components/providers/ErrorBoundary.tsx` | 客户端错误边界 | ✅ 完成 |
| `src/app/(workspace)/error.tsx` | 工作区服务端错误页 | ✅ 完成 |
| `src/app/global-error.tsx` | 全局错误兜底页 | ✅ 完成 |
| `src/hooks/useModalAccessibility.ts` | 模态框可访问性 Hook | ✅ 完成 |
| `tests/unit/financial/*.test.ts` | 财务计算测试 | ✅ 完成 |
| `tests/unit/utils/*.test.ts` | 工具函数测试 | ✅ 完成 |
| `src/lib/logging/logger.ts` | 结构化日志工具 | ✅ 完成 |
| `src/components/providers/WebVitals.tsx` | Web Vitals 报告组件 | ✅ 完成 |
| `src/app/api/health/route.ts` | 健康检查端点 | ✅ 完成 |
| `.github/workflows/ci.yml` | CI 工作流 | ⏳ 待办 |
| `.github/workflows/deploy.yml` | CD 部署工作流 | ⏳ 待办 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `package.json` | 添加依赖、脚本、lint-staged 配置、analyze 脚本、移除 expr-eval/xlsx、添加 mathjs/exceljs/langsmith |
| `next.config.ts` | 移除 `ignoreDuringBuilds: true`、集成 bundle-analyzer、Next.js 15.5+ 兼容性 |
| `docs/PRODUCT_ROADMAP.md` | 更新版本状态 |
| `src/app/(workspace)/about/page.tsx` | 修复版本信息 |
| `src/lib/database/types.ts` | 从 Supabase 重新生成 |
| `src/components/layout/SidebarProvider.tsx` | 添加 refreshSessions |
| `src/components/layout/Sidebar.tsx` | 使用 context 刷新 |
| `src/components/chat/ChatWorkspace.tsx` | 触发刷新、添加骨架屏 |
| `src/components/chat/ProcessLog.tsx` | 更新链接行为 |
| `src/components/quick-actions/ExtractionModal.tsx` | 添加可访问性 |
| `src/components/admin/PasswordModal.tsx` | 添加可访问性 |
| `src/components/documents/DocumentSelectModal.tsx` | 添加可访问性、骨架屏 |
| `src/app/(workspace)/layout.tsx` | 包裹 ErrorBoundary |
| `src/app/layout.tsx` | 集成 WebVitals 组件 |
| `src/lib/tools/generate-report.ts` | 添加 generation_time_ms 记录 |
| `.claude/rules/code-conventions.md` | 添加 RLS 设计决策文档 |
| ~25 个源文件 | ESLint 错误修复 |
| `src/lib/financial/preset-functions.ts` | expr-eval → mathjs 迁移 |
| `src/lib/extraction/structured.ts` | xlsx → exceljs 迁移 |
| `src/app/api/admin/upload-database-document/route.ts` | xlsx → exceljs 迁移 |
| `src/lib/validation/api-schemas.ts` | 添加缺失的 Zod schemas |
| `src/app/api/quick-actions/extract/route.ts` | 添加 Zod 验证 |
| `src/app/api/documents/upload-temp/route.ts` | 添加 Zod 验证 |
| `src/app/api/chat/route.ts` | 添加 Zod 验证 |
| `.env.example` | 添加 LangSmith 环境变量 |
| `docker-compose.yml` | 添加 LangSmith 环境变量 |

---

## 验证计划

### 代码质量

- [ ] `npm run lint` 返回 0 错误
- [ ] `npm run build` 成功（ESLint 启用）
- [ ] `npm run test` 可运行
- [ ] Git commit 在有 lint 错误时被阻止

### UI/UX

- [ ] 创建新会话 → 立即出现在侧边栏
- [ ] 点击过程日志来源链接 → 打开 PDF 预览（不导航）
- [ ] 加载状态显示骨架屏动画

### 健壮性

- [ ] 触发组件错误 → Error Boundary 显示恢复 UI
- [ ] 打开模态框 → 按 Escape → 关闭模态框
- [ ] 打开模态框 → Tab 键在内部循环
- [ ] 移动端模态框 → 内容可滚动，无溢出

### 数据库

- [ ] `types.ts` 包含 `reports` 表
- [ ] `npm run build` 无类型错误

### 测试

- [ ] 至少 10 个单元测试通过
- [ ] 核心财务计算有测试覆盖
- [ ] `npm run test` 全部通过

### 安全

- [ ] `npm audit` 无高危漏洞
- [ ] API 路由输入验证完整
- [ ] 安全实践已文档化

### 日志

- [ ] 日志工具支持不同级别
- [ ] 关键 API 有请求日志
- [ ] 无敏感数据泄露

### 性能基线

- [ ] `npm run analyze` 可生成打包分析报告
- [ ] API 响应时间记录在日志中
- [ ] Web Vitals 基线数据已记录

### 数据库维护

- [ ] 未使用索引已审查并记录决策
- [ ] RPC mutable search_path 警告已处理
- [ ] RLS 设计决策已文档化
- [ ] 报告生成时间正确记录

### 健康检查

- [ ] `/api/health` 返回 200 状态
- [ ] 响应包含数据库连接状态
- [ ] 响应包含服务版本信息

### CI/CD

- [ ] Push 到 development 触发 CI 工作流
- [ ] CI 包含 lint、test、build 步骤
- [ ] Merge 到 main 触发部署
- [ ] 部署后健康检查验证

### 依赖安全

- [ ] expr-eval 已移除
- [ ] mathjs 正常工作
- [ ] xlsx 已移除
- [ ] exceljs 正常工作
- [ ] `npm audit` 无高危漏洞

### 框架升级

- [ ] Next.js 升级到 15.5+
- [ ] 所有页面正常渲染
- [ ] 所有 API 路由正常工作

### API 验证

- [ ] `/api/quick-actions/extract` 使用 Zod 验证
- [ ] `/api/documents/upload-temp` 使用 Zod 验证
- [ ] `/api/chat` 使用 Zod 验证
- [ ] 验证错误返回一致格式

### Agent 可观测性

- [ ] LangSmith 依赖已安装
- [ ] 环境变量配置正确
- [ ] Agent 追踪在 LangSmith 控制台可见
- [ ] 生产环境可禁用追踪

---

*文档创建日期：2026-01-13*
*最后更新：2026-01-15（扩展范围：解决 15 项技术债务 TD-003~TD-017，添加 L~Q 任务）*
*状态：Phase 2 完成，Phase 3-5 实现中*
