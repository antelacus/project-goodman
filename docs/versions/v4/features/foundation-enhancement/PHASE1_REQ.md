# v4.3 项目基础增强 - Phase 1 需求文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 项目基础增强 (Foundation Enhancement) |
| **版本** | v4.3 |
| **依赖** | v4.2 报告生成系统 (已完成) |
| **状态** | Phase 1 - 需求定义 |

---

## 问题陈述

v4.0-4.2 完成后，核心功能（过程透明化、工具精简、报告生成）已稳定运行。在继续添加新功能前，需要进行全面的项目检查和基础加固，解决以下积累的问题：

| 领域 | 问题 | 影响 |
|------|------|------|
| **文档** | PRODUCT_ROADMAP.md 过时，文档更新流程繁琐 | 项目状态不清晰，维护负担重 |
| **代码质量** | 40+ ESLint 错误被忽略，无测试运行器，无预提交钩子 | 技术债务累积，代码质量下降 |
| **数据库** | TypeScript 类型可能过时 | 类型安全风险 |
| **页面文案** | About 页面显示 V3.7 和 GPT-5-mini | 信息误导用户 |
| **UI/UX** | 侧边栏会话不同步，过程日志链接导航问题 | 用户体验受损 |
| **健壮性** | 无 Error Boundary，加载状态不完整 | 应用不稳定 |

---

## 范围

### 范围内

**A. 文档更新（Documentation）** *— 优先执行*

1. 审查文档系统，提出改进建议（减少未来维护负担）
2. 更新 PRODUCT_ROADMAP.md

**B. 代码质量（Code Quality）**

1. 安装配置 Vitest 测试框架
2. 安装配置 Husky + lint-staged 预提交钩子
3. 修复 40+ ESLint 错误，移除 `ignoreDuringBuilds` 配置

**C. 数据库维护（Database）** *— 协作完成，用于学习*

1. 重新生成 Supabase TypeScript 类型

**D. 页面文案更新（Page Text/Copy）** *— 用户主导*

1. 修复 About 页面版本和模型信息

**E. UI/UX 改进（UI/UX Improvements）**

1. 修复侧边栏会话同步问题
2. 修复过程日志来源链接（直接预览而非导航）
3. 添加骨架屏加载组件

**F. 健壮性与可访问性（Robustness & Accessibility）**

1. 添加 Error Boundary 组件
2. 添加模态框可访问性（焦点陷阱、键盘支持）
3. 添加模态框移动端视口处理
4. 添加模态框错误状态

### 范围外

- 新功能开发（快捷操作扩展、管理用财报）
- 数据提取间歇性故障诊断（延后观察）
- CI/CD 流水线（v5 范围）
- LangSmith 可观测性（v5 范围）

---

## 需求详情

### REQ-A1: 审查文档系统

**当前状态**：每次新功能开发需更新多个文档，维护负担重。

**目标状态**：

- 审查现有文档结构（从 `~/.claude/CLAUDE.md` 开始）
- 识别冗余或过时的文档
- 提出简化建议，减少未来维护负担

**验收标准**：

- [ ] 完成文档系统审查
- [ ] 提出改进建议（如有）
- [ ] 确认需要更新的文档清单

---

### REQ-A2: 更新过时的、多余的文档或其内容

**当前状态**：文档体系复杂，很多文档或其内容存在冗余、重复、冲突等情况。

**验收标准**：

- [ ] 版本更新为当前
- [ ] 指标反映实际完成情况
- [ ] 用途清晰
- [ ] 内容准确，不和其他文档重叠

---

### REQ-B1: 安装配置 Vitest

**当前状态**：无测试框架，测试脚本需手动执行 `tsx`。

**目标状态**：

- 安装 Vitest 及相关依赖
- 配置 `vitest.config.ts`
- 添加 `npm run test` 脚本

**依赖包**：

```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "jsdom": "^25.x"
  }
}
```

**验收标准**：

- [ ] `npm run test` 命令可用
- [ ] Vitest 配置支持 TypeScript 路径别名
- [ ] 至少一个示例测试通过

---

### REQ-B2: 安装配置 Husky + lint-staged

**当前状态**：无预提交钩子，代码质量依赖人工检查。

**目标状态**：

- 安装 Husky 和 lint-staged
- 配置预提交钩子执行 ESLint 和类型检查

**依赖包**：

```json
{
  "devDependencies": {
    "husky": "^9.x",
    "lint-staged": "^15.x"
  }
}
```

**lint-staged 配置**：

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "bash -c 'tsc --noEmit'"]
  }
}
```

**验收标准**：

- [ ] `git commit` 时自动执行 ESLint
- [ ] 有 ESLint 错误的代码无法提交
- [ ] 类型错误阻止提交

---

### REQ-B3: 修复 ESLint 错误

**当前状态**：40+ ESLint 错误，`next.config.ts` 中 `ignoreDuringBuilds: true` 跳过检查。

**目标状态**：

- 修复所有 ESLint 错误
- 移除 `ignoreDuringBuilds: true` 配置
- 构建时强制执行 ESLint 检查

**高影响文件**（错误数量）：

| 文件 | 错误数 | 主要问题 |
|------|--------|----------|
| `src/lib/extraction/structured.ts` | 13 | 未使用变量、`any` 类型 |
| `src/app/api/admin/upload-database-document/route.ts` | 11 | 未使用变量、`any` 类型 |
| `src/app/api/chat/stream/route.ts` | 5 | 未使用变量 |
| `src/hooks/useStreamingChat.ts` | 3 | Hook 依赖问题 |

**验收标准**：

- [ ] `npm run lint` 返回零错误
- [ ] `npm run build` 在启用 ESLint 检查后成功
- [ ] `next.config.ts` 中 `eslint.ignoreDuringBuilds` 已移除

---

### REQ-C1: 重新生成 TypeScript 类型

> **协作任务**：此任务将与用户一起完成，作为数据库学习机会。

**当前状态**：类型文件可能未包含 v4.2 添加的 `reports` 表。

**命令**：

```bash
npx supabase gen types typescript --project-id mxybrzuxlsioqwsxyjeb > src/lib/database/types.ts
```

**验收标准**：

- [ ] `types.ts` 包含 `reports` 表定义
- [ ] TypeScript 编译通过
- [ ] 无类型错误

---

### REQ-D1: 修复 About 页面版本信息

> **用户主导任务**：用户将主导此任务，逐页检查和更新文案。

**当前状态**：

- 第 25 行：显示 "GPT-5-mini"
- 第 59 行：显示 "V3.7 (Phase 1)"

**目标状态**：

- 第 25 行：显示 "GPT-4o"
- 第 59 行：显示 "V4.2.1"

**涉及文件**：

- `src/app/(workspace)/about/page.tsx`

**验收标准**：

- [ ] About 页面显示正确的 AI 模型名称
- [ ] About 页面显示正确的版本号

---

### REQ-E1: 修复侧边栏会话同步

**当前状态**：新建聊天会话后，侧边栏不会立即显示，需刷新页面。

**目标状态**：新会话创建后立即出现在侧边栏。

**技术方案**：

1. 在 `SidebarProvider` 中添加 `refreshSessions()` 函数
2. 从 `ChatWorkspace` 在会话 ID 变化时调用刷新

**涉及文件**：

- `src/components/layout/Sidebar.tsx`
- `src/components/layout/SidebarProvider.tsx`
- `src/components/chat/ChatWorkspace.tsx`

**验收标准**：

- [ ] 创建新会话后立即出现在侧边栏
- [ ] 无需刷新页面
- [ ] 不影响现有会话列表功能

---

### REQ-E2: 修复过程日志来源链接

**当前状态**：点击过程日志中的文档链接导航到 `/documents` 页面，中断用户工作流。

**目标状态**：直接打开文件预览（PDF 预览或模态框）。

**技术方案**：

1. 检查 `source.fileUrl` 是否可用
2. 如果是 PDF，使用现有 PDF 预览 API
3. 在新标签页或模态框中打开

**涉及文件**：

- `src/components/chat/ProcessLog.tsx`
- 可能需创建 `src/components/documents/PdfPreviewModal.tsx`

**验收标准**：

- [ ] 点击来源链接直接打开文件预览
- [ ] 不导航离开当前页面
- [ ] 对于不支持预览的文件类型优雅降级

---

### REQ-E3: 添加骨架屏加载组件

**当前状态**：加载状态显示为简单文本（如"加载中..."）。

**目标状态**：使用骨架屏组件提供更好的加载体验。

**涉及文件**：

- 创建 `src/components/ui/Skeleton.tsx`
- 更新 `src/components/chat/ChatWorkspace.tsx`
- 更新 `src/components/layout/Sidebar.tsx`
- 更新 `src/components/documents/DocumentSelectModal.tsx`

**验收标准**：

- [ ] 聊天加载时显示消息骨架屏
- [ ] 侧边栏会话加载时显示列表骨架屏
- [ ] 文档选择模态框加载时显示骨架屏

---

### REQ-F1: 添加 Error Boundary 组件

**当前状态**：组件渲染错误会导致整个应用崩溃。

**目标状态**：错误被 Error Boundary 捕获，显示友好的恢复 UI。

**涉及文件**：

- 创建 `src/components/providers/ErrorBoundary.tsx`
- 更新 `src/app/(workspace)/layout.tsx`

**验收标准**：

- [ ] 组件抛出错误时显示错误恢复界面
- [ ] 提供"重试"按钮
- [ ] 错误详情在开发模式下可见

---

### REQ-F2: 添加模态框可访问性

**当前状态**：模态框缺少焦点陷阱、Escape 键支持、ARIA 属性。

**目标状态**：模态框符合 WCAG 可访问性标准。

**涉及文件**：

- `src/components/quick-actions/ExtractionModal.tsx`
- `src/components/admin/PasswordModal.tsx`
- `src/components/documents/DocumentSelectModal.tsx`
- 创建 `src/hooks/useFocusTrap.ts` 或 `useModalAccessibility.ts`

**验收标准**：

- [ ] 模态框打开时焦点移入
- [ ] Tab 键在模态框内循环
- [ ] Escape 键关闭模态框
- [ ] 添加 `role="dialog"` 和 `aria-modal="true"`

---

### REQ-F3: 添加模态框移动端处理

**当前状态**：模态框在移动端可能溢出或难以操作。

**目标状态**：模态框在移动端正确显示和滚动。

**验收标准**：

- [ ] 模态框内容在小屏幕上可滚动
- [ ] 使用 `dvh` 处理移动端视口
- [ ] 触摸区域足够大（>44x44 像素）

---

### REQ-F4: 添加模态框错误状态

**当前状态**：模态框异步操作失败时可能使用 `alert()` 或无反馈。

**目标状态**：内联显示错误消息，提供重试机制。

**验收标准**：

- [ ] 错误消息内联显示在模态框内
- [ ] 用户操作后清除错误
- [ ] 提供重试选项

---

## 需修改的文件汇总

| 类别 | 文件 | 变更 |
|------|------|------|
| **文档** | `PRODUCT_ROADMAP.md` | 状态更新 |
| **配置** | `package.json` | 添加 Vitest、Husky、lint-staged |
| **配置** | `next.config.ts` | 移除 `ignoreDuringBuilds` |
| **配置** | 创建 `vitest.config.ts` | Vitest 配置 |
| **配置** | 创建 `.husky/pre-commit` | 预提交钩子 |
| **代码** | 25 个源文件 | ESLint 错误修复 |
| **类型** | `types.ts` | 重新生成 |
| **组件** | `about/page.tsx` | 版本信息 |
| **组件** | `Sidebar.tsx`, `SidebarProvider.tsx` | 会话同步 |
| **组件** | `ProcessLog.tsx` | 来源链接 |
| **组件** | 创建 `Skeleton.tsx` | 骨架屏组件 |
| **组件** | 创建 `ErrorBoundary.tsx` | 错误边界 |
| **组件** | 3 个模态框组件 | 可访问性 |

---

## 风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| ESLint 修复引入 bug | 中 | 中 | 逐步修复，每批次测试 |
| 预提交钩子过慢 | 低 | 低 | 仅检查暂存文件 |
| 会话同步引起性能问题 | 低 | 中 | 避免频繁刷新，使用防抖 |
| Error Boundary 影响开发调试 | 低 | 低 | 开发模式显示详细错误 |

---

## 成功标准

1. **文档与信息**
   - 文档系统已审查，改进建议已记录
   - PRODUCT_ROADMAP.md 反映当前状态
   - About 页面显示正确版本
   - TypeScript 类型与数据库同步

2. **代码质量**
   - `npm run lint` 零错误
   - `npm run build` 成功（ESLint 启用）
   - `npm run test` 可用

3. **UI/UX**
   - 新会话立即出现在侧边栏
   - 来源链接直接打开预览
   - 加载状态使用骨架屏

4. **健壮性**
   - 组件错误被 Error Boundary 捕获
   - 模态框支持键盘操作
   - 模态框在移动端正常显示

---

*文档创建日期：2026-01-13*
*状态：等待审批后进入 Phase 2*
