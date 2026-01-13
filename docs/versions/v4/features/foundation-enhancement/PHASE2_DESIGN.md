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

---

## A. 文档更新

### A1: 文档系统审查

**方法**：审查现有文档结构，提出简化建议。

**当前状态**：
- `docs/` 目录下 58 个 markdown 文件
- 版本文档分散在 `docs/versions/v*/features/` 下
- 每次版本更新需同步多个文档

**输出**：在 PHASE3-5_TRACK.md 中记录建议。

### A2: 更新 PRODUCT_ROADMAP.md

**文件**：`docs/PRODUCT_ROADMAP.md`

**变更内容**：
- 更新"最后更新"日期
- 标记 v4.0、v4.1、v4.2 为已发布（含日期）
- 添加 v4.3、v4.4、v4.5 为计划项
- 更正指标（报告类型：1，非 3）

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

---

## D. 页面文案更新

### D1: About 页面修复

**文件**：`src/app/(workspace)/about/page.tsx`

| 行号 | 当前值 | 目标值 |
|------|--------|--------|
| 25 | "GPT-5-mini" | "GPT-4o" |
| 59 | "V3.7 (Phase 1)" | "V4.2.1" |

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

2. **Sidebar.tsx**：
```typescript
const { refreshTrigger } = useSidebar();

useEffect(() => {
  fetchSessions();
}, [refreshTrigger]);
```

3. **ChatWorkspace.tsx**：
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

## 实现顺序

| 优先级 | 任务 | 依赖 |
|--------|------|------|
| 1 | A2: 更新 PRODUCT_ROADMAP.md | 无 |
| 2 | D1: 修复 About 页面 | 无 |
| 3 | C1: 重新生成类型 | 无 |
| 4 | B1: 安装 Vitest | 无 |
| 5 | B2: 安装 Husky + lint-staged | B1 |
| 6 | B3: 修复 ESLint 错误 | B2 |
| 7 | E3: 骨架屏组件 | 无 |
| 8 | F1: Error Boundary | 无 |
| 9 | F2-F4: 模态框可访问性 | 无 |
| 10 | E1: 侧边栏会话同步 | 无 |
| 11 | E2: 过程日志链接 | 无 |
| 12 | A1: 文档系统审查 | 全部完成后 |

---

## 文件清单

### 新建文件

| 文件 | 用途 |
|------|------|
| `vitest.config.ts` | 测试框架配置 |
| `.husky/pre-commit` | 预提交钩子 |
| `src/components/ui/Skeleton.tsx` | 骨架屏组件 |
| `src/components/providers/ErrorBoundary.tsx` | 客户端错误边界（关键） |
| `src/app/(workspace)/error.tsx` | 工作区服务端错误页 |
| `src/app/global-error.tsx` | 全局错误兜底页 |
| `src/hooks/useModalAccessibility.ts` | 模态框可访问性 Hook |

### 修改文件

| 文件 | 变更 |
|------|------|
| `package.json` | 添加依赖、脚本、lint-staged 配置 |
| `next.config.ts` | 移除 `ignoreDuringBuilds: true` |
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
| ~25 个源文件 | ESLint 错误修复 |

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

---

*文档创建日期：2026-01-13*
*状态：Phase 2 完成，进入 Phase 3-5 实现*
