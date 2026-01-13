# v4.3 项目基础增强 - Phase 3-5 实现跟踪

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 项目基础增强 (Foundation Enhancement) |
| **版本** | v4.3 |
| **状态** | Phase 3-5 - 实现中 |
| **设计文档** | [PHASE2_DESIGN.md](./PHASE2_DESIGN.md) |

---

## 实现任务

### A. 文档更新

#### A1: 文档系统审查

- [ ] 审查现有文档结构（从 `~/.claude/CLAUDE.md` 开始）
- [ ] 识别冗余、缺乏或过时的文档
- [ ] 记录简化建议

#### A2: 更新过时的、多余的文档或其内容

- [ ] 根据简化建议更新并实施

---

### B. 代码质量

#### B1: 安装配置 Vitest

- [ ] 安装依赖：vitest, @vitest/coverage-v8, @vitejs/plugin-react, vite-tsconfig-paths, jsdom
- [ ] 创建 `vitest.config.ts`
- [ ] 添加 `npm run test` 脚本
- [ ] 添加 `npm run test:coverage` 脚本
- [ ] 创建示例测试验证配置

#### B2: 安装配置 Husky + lint-staged

- [ ] 安装依赖：husky, lint-staged
- [ ] 运行 `npx husky init`
- [ ] 创建 `.husky/pre-commit` 钩子
- [ ] 配置 lint-staged 规则
- [ ] 测试预提交钩子

#### B3: 修复 ESLint 错误

- [ ] 修复 `src/lib/extraction/structured.ts` (13 errors)
- [ ] 修复 `src/app/api/admin/upload-database-document/route.ts` (11 errors)
- [ ] 修复 `src/app/api/chat/stream/route.ts` (5 errors)
- [ ] 修复 `src/hooks/useStreamingChat.ts` (3 errors + 1 warning)
- [ ] 修复剩余文件的错误
- [ ] 移除 `next.config.ts` 中的 `ignoreDuringBuilds: true`
- [ ] 验证 `npm run lint` 返回 0 错误
- [ ] 验证 `npm run build` 成功

---

### C. 数据库维护

#### C1: 重新生成 TypeScript 类型

- [ ] 运行 Supabase 类型生成命令
- [ ] 验证 `reports` 表定义存在
- [ ] 验证 TypeScript 编译通过

---

### D. 页面文案更新

#### D1: 修复 About 页面

- [ ] 更新 AI 模型名称：GPT-5-mini → GPT-4o
- [ ] 更新版本号：V3.7 (Phase 1) → V4.2.1

---

### E. UI/UX 改进

#### E1: 侧边栏会话同步

- [ ] 在 `SidebarProvider.tsx` 添加 `refreshSessions` 函数
- [ ] 在 `SidebarProvider.tsx` 添加 `refreshTrigger` 状态
- [ ] 更新 context type 定义
- [ ] 在 `Sidebar.tsx` 监听 `refreshTrigger`
- [ ] 在 `ChatWorkspace.tsx` 调用 `refreshSessions`
- [ ] 测试新会话立即显示

#### E2: 过程日志来源链接

- [ ] 更新 `ProcessLog.tsx` 链接生成逻辑
- [ ] 使用 PDF 预览 API 路径
- [ ] 测试链接在新标签页打开

#### E3: 骨架屏组件

- [ ] 创建 `src/components/ui/Skeleton.tsx`
- [ ] 实现基础 `Skeleton` 组件
- [ ] 实现 `SkeletonText` 变体
- [ ] 实现 `SkeletonSessionList` 变体
- [ ] 实现 `SkeletonMessage` 变体
- [ ] 在 `Sidebar.tsx` 使用骨架屏
- [ ] 在 `ChatWorkspace.tsx` 使用骨架屏
- [ ] 在 `DocumentSelectModal.tsx` 使用骨架屏

---

### F. 健壮性与可访问性

#### F1: Error Boundary 组件（关键优先）

> **重要性**：此功能为关键优先项，需优先实现。

**客户端错误边界**：

- [ ] 创建 `src/components/providers/ErrorBoundary.tsx`
- [ ] 实现错误捕获逻辑
- [ ] 实现 console.error 日志
- [ ] 实现默认错误 UI（重试按钮）
- [ ] 开发模式显示错误详情
- [ ] 在 `layout.tsx` 中包裹内容

**服务端/异步组件错误**：

- [ ] 创建 `src/app/(workspace)/error.tsx`
- [ ] 创建 `src/app/global-error.tsx`

#### F2-F4: 模态框可访问性

- [ ] 创建 `src/hooks/useModalAccessibility.ts`
- [ ] 实现 Escape 键关闭
- [ ] 实现焦点陷阱（Tab 循环）
- [ ] 实现焦点保存/恢复
- [ ] 实现点击外部关闭
- [ ] 更新 `ExtractionModal.tsx`
- [ ] 更新 `PasswordModal.tsx`
- [ ] 更新 `DocumentSelectModal.tsx`
- [ ] 添加 ARIA 属性
- [ ] 添加移动端视口处理 (`max-h-[85dvh]`)

---

## 实现记录

### 2026-01-13

*记录实现过程中的详细变更...*

---

## 测试清单

### Phase 5 - 综合测试

#### 代码质量

- [ ] `npm run lint` 返回 0 错误
- [ ] `npm run build` 成功（ESLint 启用）
- [ ] `npm run test` 可运行并通过
- [ ] Git commit 测试 lint 错误阻止

#### UI/UX

- [ ] 创建新会话 → 立即出现在侧边栏
- [ ] 点击过程日志来源链接 → 打开 PDF 预览
- [ ] 加载状态显示骨架屏动画

#### 健壮性

- [ ] 触发组件错误 → Error Boundary 显示恢复 UI
- [ ] 打开模态框 → 按 Escape → 关闭模态框
- [ ] 打开模态框 → Tab 键在内部循环
- [ ] 移动端模态框 → 内容可滚动

#### 数据库

- [ ] `types.ts` 包含 `reports` 表
- [ ] TypeScript 编译无错误

---

*文档创建日期：2026-01-13*
*状态：实现中*
