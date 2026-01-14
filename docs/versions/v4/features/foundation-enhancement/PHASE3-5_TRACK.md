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

### A. 文档更新 ✅

#### A1: 文档系统审查 ✅

- [x] 审查全局 `~/.claude/CLAUDE.md` 结构
- [x] 审查项目根目录文档 (`README.md`, `CLAUDE.md`, `CHANGELOG.md`)
- [x] 审查 `docs/` 目录文档 (`PRODUCT_ROADMAP.md`, `KNOWN_ISSUES.md`, `TECHNICAL_DEBT.md`, `DEPLOYMENT_CHECKLIST.md`)
- [x] 审查 `v4_DEVELOPMENT_PLAN.md`
- [x] 识别问题：文档同步负担、职责不清、版本映射错误

#### A2: 更新过时的、多余的文档或其内容 ✅

- [x] 全局 CLAUDE.md：添加 "Sources of Truth" 表、"Changelog Management" 章节、"Post-Release Documentation"
- [x] README.md：重写为用户指南（非技术文档）
- [x] PRODUCT_ROADMAP.md：简化为战略层面，移除版本详情
- [x] KNOWN_ISSUES.md：翻译为简体中文
- [x] DEPLOYMENT_CHECKLIST.md：添加 Post-Release Documentation 章节
- [x] v4_DEVELOPMENT_PLAN.md：修正 v4.3/v4.4 版本映射

---

### B. 代码质量 ✅

#### B1: 安装配置 Vitest ✅

- [x] 安装依赖：vitest, @vitest/coverage-v8, @vitejs/plugin-react, vite-tsconfig-paths, jsdom
- [x] 创建 `vitest.config.ts`
- [x] 添加 `npm run test` 脚本
- [x] 添加 `npm run test:coverage` 脚本
- [x] 创建示例测试验证配置

#### B2: 安装配置 Husky + lint-staged ✅

- [x] 安装依赖：husky, lint-staged
- [x] 运行 `npx husky init`
- [x] 创建 `.husky/pre-commit` 钩子
- [x] 配置 lint-staged 规则
- [x] 测试预提交钩子

#### B3: 修复 ESLint 错误 ✅

- [x] 修复 `src/lib/extraction/structured.ts` (13 errors)
- [x] 修复 `src/app/api/admin/upload-database-document/route.ts` (11 errors)
- [x] 修复 `src/app/api/chat/stream/route.ts` (5 errors)
- [x] 修复 `src/hooks/useStreamingChat.ts` (3 errors + 1 warning)
- [x] 修复剩余文件的错误
- [x] 移除 `next.config.ts` 中的 `ignoreDuringBuilds: true`
- [x] 验证 `npm run lint` 返回 0 错误
- [x] 验证 `npm run build` 成功

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

### 2026-01-13 - 文档系统审查与重构

#### A1: 文档系统审查

**审查范围**：
- 全局 `~/.claude/CLAUDE.md`
- 项目根目录：`README.md`, `CLAUDE.md`, `CHANGELOG.md`
- `docs/` 目录：`PRODUCT_ROADMAP.md`, `KNOWN_ISSUES.md`, `TECHNICAL_DEBT.md`, `DEPLOYMENT_CHECKLIST.md`
- `docs/versions/v4/v4_DEVELOPMENT_PLAN.md`

**发现的问题**：

1. **文档同步负担过重**：PRODUCT_ROADMAP.md 包含版本详情，与 DEVELOPMENT_PLAN.md 重复
2. **缺少文档职责定义**：不清楚哪个文档是哪类信息的 "source of truth"
3. **CHANGELOG.md 未被定义**：虽然在使用，但未在流程中正式定义
4. **Phase 6 缺少文档更新步骤**：部署后应更新哪些文档不明确
5. **v4_DEVELOPMENT_PLAN.md 版本映射错误**：v4.3 错误标记为 quick-actions

#### A2: 文档更新实施

**全局 CLAUDE.md 更新**：
- 新增 "Documentation Sources of Truth" 表格，明确各文档职责
- 简化 PRODUCT_ROADMAP.md 结构定义（仅保留战略层面）
- 新增 "Changelog Management" 章节
- Phase 6 新增 "Post-Release Documentation" 清单
- 更新日期：2026-01-08 → 2026-01-13

**README.md 重写**：
- 从技术文档转型为用户指南
- 新增用户角色说明（访客、管理员）
- 新增功能详解（智能对话、报告生成、文档提取、文档管理）
- 移除所有技术内容（技术栈、目录结构等移至 CLAUDE.md）

**PRODUCT_ROADMAP.md 简化**：
- 移除 "现状评估" 章节（版本特定）
- 移除 "优先级排序的待办列表"（移至 DEVELOPMENT_PLAN）
- 移除 "版本路线图" 详情（移至 DEVELOPMENT_PLAN）
- 新增 "战略优先级" 章节（高层次主题，无版本绑定）
- 更新用户反馈状态

**KNOWN_ISSUES.md**：
- 翻译为简体中文
- 更新 UI/UX 问题计划版本：v4.4 → v4.3

**DEPLOYMENT_CHECKLIST.md**：
- 新增 6.1 "Post-Release Documentation" 子章节
- 版本更新：v4.1 → v4.2

**v4_DEVELOPMENT_PLAN.md 修正**：
- 修正文档结构图：quick-actions → foundation-enhancement (v4.3)
- 修正版本路线图：v4.3 = 项目基础增强，v4.4 = 快捷操作扩展
- 重写 3.4 章节为 foundation-enhancement
- 重写 3.5 章节为 quick-actions

**提交**: `9491bdb` - docs(v4.3): comprehensive documentation review and restructuring

### 2026-01-14 - 代码质量工具配置

#### B1: Vitest 测试框架

**安装的依赖**：
- vitest
- @vitest/coverage-v8
- @vitejs/plugin-react
- vite-tsconfig-paths
- jsdom

**创建的文件**：
- `vitest.config.ts` - 配置 React 插件、TypeScript 路径别名、jsdom 环境
- `tests/unit/example.test.ts` - 示例测试验证配置

**添加的脚本**：
- `npm run test` - 运行 vitest
- `npm run test:coverage` - 运行 vitest 并生成覆盖率报告

#### B2: Husky + lint-staged 预提交钩子

**配置**：
- `.husky/pre-commit` - 调用 `npx lint-staged`
- `package.json` lint-staged 配置：
  - `*.ts, *.tsx` → `eslint --fix`
  - `*.ts, *.tsx, *.json, *.md` → `prettier --write`

#### B3: ESLint 错误修复

**修复策略**：
- 移除未使用的导入（unused imports）
- 移除未使用的变量（unused variables）
- 对必要的 `any` 类型添加 `// REASON:` 注释和 eslint-disable
- 修复 React Hooks 依赖数组（useCallback）
- 修复 TypeScript 类型不匹配

**主要修复文件**：
- `src/lib/extraction/structured.ts` - 导出用于类型推断的 schema，添加 XLSX/Zod any 注释
- `src/app/api/admin/upload-database-document/route.ts` - 移除未使用导入，修复类型
- `src/app/api/chat/stream/route.ts` - 移除未使用导入，修复 any 类型
- `src/hooks/useStreamingChat.ts` - 重构 useCallback 依赖，修复 error 类型
- 其他文件：移除未使用导入/变量

**验证**：
- `npm run lint` → 0 errors
- `npm run build` → 成功

---

## 测试清单

### Phase 5 - 综合测试

#### 代码质量

- [x] `npm run lint` 返回 0 错误
- [x] `npm run build` 成功（ESLint 启用）
- [x] `npm run test` 可运行并通过
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
