# 命名规范重构计划

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 命名规范重构 (Naming Convention Refactor) |
| **版本** | v4.6+ |
| **状态** | 计划中 |
| **关联** | 性能优化 Phase 3-5 后续优化 |

---

## 1. 问题陈述

### 1.1 当前命名混淆

系统中存在两个主要工作流，但命名未能清晰区分：

**工作流 A：用户/访客上传（工作区文档）**
```
用户上传文件 → /api/documents/upload-temp
    ↓
解析为文本（内部）
    ↓
存储到 DB + Storage（访客文档会过期）
    ↓
后续：快捷操作 → /api/quick-actions/extract
    └─ 返回结构化键值对到 UI
```

**工作流 B：管理员上传（知识库文档）**
```
管理员上传文件 → /api/admin/upload-database-document
    ↓
解析为文本（内部）
    ↓
提取财务指标 → financial_data 表
    ↓
存储到 DB + Storage（永久保存）
```

### 1.2 具体问题

| 当前名称 | 问题 |
|----------|------|
| `upload-temp` | 误导性 - 文件实际上永久存储；"temp" 指的是所有权过期，而非存储 |
| `extract` | 重载 - 既指"解析文件为文本"（内部），又指"提取结构化数据"（用户功能） |
| `local-documents` | 误导性 - 从 Supabase 获取，而非本地 |
| `document` | 重载 - DB 记录 vs 文件 vs UI 概念 |
| `extractTextFromFile()` | 与快捷操作的 `extract` 混淆 |

---

## 2. 命名规范设计

### 2.1 领域划分

| 领域 | 前缀/命名 | 描述 |
|------|-----------|------|
| **工作区** | `workspace` | 用户/访客上传的文件，用于对话上下文 |
| **知��库** | `knowledge` | 管理员管理的永久文档 |
| **快捷操作** | `quick-actions` | 用户可用的快捷功能 |
| **解析** | `parse` | 文件转文本的内部操作 |
| **提取** | `extract` | 结构化数据提取（用户功能） |

### 2.2 操作命名约定

| 操作类型 | 命名模式 | 示例 |
|----------|----------|------|
| 文件 → 文本 | `parse*ToText()` | `parsePdfToText()`, `parseExcelToText()` |
| 结构化提取 | `extract*Data()` | `extractFinancialData()`, `extractKeyValueData()` |
| 存储操作 | `*File()` | `uploadFile()`, `downloadFile()` |
| DB 操作 | `*Document()` | `createDocument()`, `deleteDocument()` |

---

## 3. 变更清单

### 3.1 API 路由重命名

| 当前路由 | 新路由 | 说明 |
|----------|--------|------|
| `/api/documents/upload-temp` | `/api/workspace/upload` | 工作区文件上传 |
| `/api/local-documents` | `/api/workspace/documents` | 获取工作区文档列表 |
| `/api/admin/upload-database-document` | `/api/admin/knowledge/upload` | 知识库文档上传 |
| `/api/quick-actions/extract` | `/api/quick-actions/extract-data` | 明确是数据提取 |

### 3.2 目录结构重组

**当前结构：**
```
src/lib/
├── documents/           # 混合了工作区和知识库逻辑
│   ├── storage.ts
│   ├── search.ts
│   ├── chunker.ts
│   └── ...
├── extraction/          # 财务数据提取（知识库）
│   ├── structured.ts
│   ├── ai.ts
│   └── column.ts
└── ...
```

**目标结构：**
```
src/lib/
├── workspace/           # 工作区文档操作
│   ├── upload.ts        # 工作区上传逻辑（从 upload-temp 迁移）
│   ├── documents.ts     # 工作区文档查询
│   └── index.ts
├── knowledge/           # 知识库操作
│   ├── upload.ts        # 知识库上传逻辑
│   ├── extraction/      # 财务/法规提取（从 src/lib/extraction 迁移）
│   │   ├── financial.ts
│   │   ├── regulation.ts
│   │   └── index.ts
│   └── index.ts
├── documents/           # 通用文档操作（两者共用）
│   ├── storage.ts       # Supabase Storage 操作
│   ├── search.ts        # 混合搜索
│   ├── chunker.ts       # 文本分块
│   └── index.ts
├── parsing/             # 文件解析（内部操作）
│   ├── pdf.ts           # PDF 解析
│   ├── excel.ts         # Excel 解析
│   ├── image.ts         # 图片 OCR
│   ├── text.ts          # 文本文件解析
│   └── index.ts
└── quick-actions/       # 快捷操作逻辑
    ├── extract-data.ts  # 结构化数据提取
    └── index.ts
```

### 3.3 函数重命名

| 当前函数 | 新函数 | 位置 |
|----------|--------|------|
| `extractTextFromFile()` | `parseFileToText()` | `src/lib/parsing/index.ts` |
| `extractTextFromPDF()` | `parsePdfToText()` | `src/lib/parsing/pdf.ts` |
| `extractTextFromExcel()` | `parseExcelToText()` | `src/lib/parsing/excel.ts` |
| `extractTextFromImage()` | `parseImageToText()` | `src/lib/parsing/image.ts` |
| `performStructuredExtraction()` | `extractFinancialData()` | `src/lib/knowledge/extraction/financial.ts` |
| `performAIExtraction()` | `extractWithAI()` | `src/lib/knowledge/extraction/financial.ts` |

### 3.4 数据库字段

| 当前值 | 新值 | 字段 | 说明 |
|--------|------|------|------|
| `'business'` | `'workspace'` | `doc_category` | 工作区文档 |
| `'knowledge'` | (保持) | `doc_category` | 知识库文档 |

**迁移 SQL：**
```sql
UPDATE documents SET doc_category = 'workspace' WHERE doc_category = 'business';
```

### 3.5 UI 组件

| 当前组件/文件 | 变更 |
|---------------|------|
| `DocumentSelectModal.tsx` | 内部注释更新，明确是工作区文档选择器 |
| `src/store/documents.ts` | 重命名为 `src/store/workspace-documents.ts` |

---

## 4. 实现阶段

### Phase 1：基础设施准备（低风险）

**目标**：创建新目录结构，不破坏现有功能

**任务**：
- [ ] 创建 `src/lib/parsing/` 目录
- [ ] 创建 `src/lib/workspace/` 目录
- [ ] 创建 `src/lib/knowledge/` 目录
- [ ] 将解析函数复制到 `parsing/`（保留原函数）
- [ ] 添加新函数作为旧函数的别名导出

**验证**：
- 所有现有测试通过
- 构建成功

### Phase 2：API 路由迁移（中风险）

**目标**：创建新路由，旧路由重定向

**任务**：
- [ ] 创建 `/api/workspace/upload` 路由
- [ ] 创建 `/api/workspace/documents` 路由
- [ ] 创建 `/api/admin/knowledge/upload` 路由
- [ ] 创建 `/api/quick-actions/extract-data` 路由
- [ ] 旧路由添加重定向或代理到新路由
- [ ] 更新前端调用点

**验证**：
- 新旧路由都能正常工作
- 前端功能正常

### Phase 3：消费者更新（中风险）

**目标**：更新所有导入和调用点

**任务**：
- [ ] 更新所有 `extractTextFromFile` 调用为 `parseFileToText`
- [ ] 更新所有 API 调用路径
- [ ] 更新 store 命名
- [ ] 更新组件导入

**验证**：
- 全量测试通过
- E2E 测试通过

### Phase 4：数据库迁移（低风险）

**目标**：更新 `doc_category` 值

**任务**：
- [ ] 创建迁移脚本
- [ ] 在 staging 验证
- [ ] 应用到生产

**验证**：
- 文档查询正常
- 权限检查正常

### Phase 5：清理（低风险）

**目标**：移除旧代码和路由

**任务**：
- [ ] 移除旧 API 路由
- [ ] 移除旧函数别名
- [ ] 移除 `src/lib/extraction/` 目录（已迁移到 knowledge/extraction）
- [ ] 更新文档

**验证**：
- 构建成功
- 无未使用的导出

---

## 5. 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| 前端调用点遗漏 | 中 | 全局搜索 + TypeScript 编译检查 |
| 外部集成依赖旧路由 | 低 | 当前无外部集成 |
| 数据库迁移失败 | 低 | 简单 UPDATE，可回滚 |
| 测试覆盖不足 | 中 | 先补充测试再重构 |

---

## 6. 回滚策略

每个 Phase 都可独立回滚：

- **Phase 1**：删除新目录即可
- **Phase 2**：删除新路由，前端回退到旧路径
- **Phase 3**：Git revert 导入变更
- **Phase 4**：`UPDATE documents SET doc_category = 'business' WHERE doc_category = 'workspace'`
- **Phase 5**：从 Git 恢复旧文件

---

## 7. 时间估算

| Phase | 预估工作量 |
|-------|-----------|
| Phase 1 | 2-3 小时 |
| Phase 2 | 3-4 小时 |
| Phase 3 | 2-3 小时 |
| Phase 4 | 0.5 小时 |
| Phase 5 | 1 小时 |
| **总计** | **8-11 小时** |

---

## 8. 决策点

在开始实施前，需要确认以下决策：

### Q1：是否保留旧路由作为别名？

**选项 A**：保留 1-2 个版本周期后移除
- 优点：平滑过渡
- 缺点：维护两套路由

**选项 B**：直接替换
- 优点：代码简洁
- 缺点：需要一次性更新所有调用点

**建议**：选项 B（当前无外部依赖）

### Q2：`doc_category` 值是否需要迁移？

**选项 A**：迁移 `business` → `workspace`
- 优点：命名一致
- 缺点：需要数据库迁移

**选项 B**：保持 `business`，仅在代码中使用常量
- 优点：无数据库变更
- 缺点：代码与数据不一致

**建议**：选项 A（迁移简单，一致性更重要）

### Q3：是否在此版本实施？

**选项 A**：v4.6 中实施
- 优点：趁热打铁
- 缺点：v4.6 范围扩大

**选项 B**：v4.7 单独实施
- 优点：v4.6 保持聚焦
- 缺点：延迟改进

**建议**：选项 B（v4.6 已完成，作为 v4.7 独立功能）

---

## 9. 附录：完整映射表

### API 路由映射

| 旧路由 | 新路由 | HTTP 方法 |
|--------|--------|-----------|
| `/api/documents/upload-temp` | `/api/workspace/upload` | POST |
| `/api/local-documents` | `/api/workspace/documents` | GET |
| `/api/documents` | `/api/documents` | DELETE, PATCH |
| `/api/admin/upload-database-document` | `/api/admin/knowledge/upload` | POST |
| `/api/quick-actions/extract` | `/api/quick-actions/extract-data` | POST |

### 文件映射

| 旧文件 | 新文件 |
|--------|--------|
| `src/app/api/documents/upload-temp/route.ts` | `src/app/api/workspace/upload/route.ts` |
| `src/app/api/local-documents/route.ts` | `src/app/api/workspace/documents/route.ts` |
| `src/app/api/admin/upload-database-document/route.ts` | `src/app/api/admin/knowledge/upload/route.ts` |
| `src/app/api/quick-actions/extract/route.ts` | `src/app/api/quick-actions/extract-data/route.ts` |
| `src/lib/extraction/structured.ts` | `src/lib/knowledge/extraction/financial.ts` |
| `src/lib/extraction/ai.ts` | `src/lib/knowledge/extraction/ai.ts` |
| `src/lib/extraction/column.ts` | `src/lib/knowledge/extraction/column.ts` |
| `src/store/documents.ts` | `src/store/workspace-documents.ts` |

### 函数映射

| 旧函数 | 新函数 | 新位置 |
|--------|--------|--------|
| `extractTextFromFile()` | `parseFileToText()` | `src/lib/parsing/index.ts` |
| `extractTextFromPDF()` | `parsePdfToText()` | `src/lib/parsing/pdf.ts` |
| `extractTextFromExcel()` | `parseExcelToText()` | `src/lib/parsing/excel.ts` |
| `extractTextFromImage()` | `parseImageToText()` | `src/lib/parsing/image.ts` |
| `performStructuredExtraction()` | `extractFinancialData()` | `src/lib/knowledge/extraction/index.ts` |
| `performAIExtraction()` | `extractWithAI()` | `src/lib/knowledge/extraction/ai.ts` |
| `performColumnBasedExtraction()` | `extractFromColumns()` | `src/lib/knowledge/extraction/column.ts` |
