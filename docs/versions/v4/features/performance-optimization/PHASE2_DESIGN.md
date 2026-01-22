# v4.6 性能优化 - Phase 2 设计文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 性能优化 (Performance Optimization) |
| **版本** | v4.6 |
| **状态** | Phase 2 - 设计完成 |
| **Phase 1 文档** | [PHASE1_REQ.md](./PHASE1_REQ.md) |

---

## 1. 目标与成功标准

v4.6 的核心目标是“**可靠性优先**”：所有关键流程可稳定完成，且可被指标验证。

**成功标准（P0）**：

- 成功率 ≥ 98%
- 5xx 错误率 ≤ 0.5%
- P95 延迟目标：
  - 非 AI API < 1s
  - Chat 首 token < 3s，整体 < 12s
  - 报告生成 < 60s
  - 文档提取 < 45s

**交付导向**：建立“关键流程 → 指标 → 验收”映射，确保每项稳定性都有可验证证据。

---

## 2. 现状基础与假设

v4.6 依赖 v4.4 完成以下基础能力：

1. **Staging 环境可用**，具备健康检查与发布前验证能力。
2. **可观测性基础设施已就绪**（错误追踪、Uptime、日志采集）。
3. 应用侧已有 **结构化日志**（`src/lib/logging/logger.ts`）、`requestId` 贯穿（`createErrorResponse`）、以及少量关键路径的 `logRequest`/`logError` 使用。
4. 现有 Web Vitals 仅输出控制台（需纳入指标口径而非新增系统）。

**设计原则**：v4.5 不新建监控平台，只补齐“可观测性契约”与关键流程稳定性。

---

## 3. 总体架构与关键设计

### 3.1 Workflow Reliability Matrix（可靠性矩阵）

建立统一矩阵，明确每条 P0/P1 流程的：

- 入口 API
- 成功判定
- 错误分类
- 关键日志字段
- 指标映射与验收步骤

矩阵是 v4.6 的核心输出之一，用于连接“稳定性改进”和“可观测性验证”。

### 3.2 可观测性契约（Observability Contract）

所有 P0 流程必须输出以下结构化日志字段：

```json
{
  "workflow": "report_generation",
  "step": "start|success|failure",
  "status": "ok|error",
  "duration": 5234,
  "errorType": "REPORT_FAILED",
  "requestId": "req_xxx"
}
```

该契约通过已有 `logger` 输出（无需新增表）。必要时可由 v4.4 的日志/指标系统进行采集与聚合。

### 3.3 关键流程拆分

P0 关键流程定义如下：

- Agent 工作流（Chat 主流程）
- 检索（文档搜索 + 结构化查询）
- 文档提取（上传 → 提取 → 存储）
- 报告生成
- Quick Actions（Extract）
- 管理员上传/配置流程

P1 流程为次要功能与低频操作，仅要求可用性保障与清晰提示。

---

## 4. 指标口径与验收机制

### 4.1 统计口径

- **采样周期**：至少 7 天或 ≥ 200 次请求（取较高者）。
- **成功率**：流程完成并返回预期成功响应（SSE 需有完成事件）。
- **错误率**：HTTP 5xx / 总请求。
- **P95**：基于日志的 `duration` 字段计算。

### 4.2 指标映射（示例）

| 流程 | 入口 | 成功判定 | 指标 | 日志字段 |
|------|------|----------|------|----------|
| 报告生成 | `/api/reports/generate` | SSE 完成事件 | 成功率、5xx、P95 | workflow=report_generation |
| 文档提取 | `/api/documents/upload-temp` | 提取成功 & 标准响应 | 成功率、5xx、P95 | workflow=document_extraction |
| Chat | `/api/chat/stream` | 首 token + 完成事件 | 首 token P95、总耗时 | workflow=chat_stream |

具体完整矩阵在实现阶段生成并纳入回归验证。

---

## 5. 错误分类与降级策略

### 5.1 统一错误分类

定义统一错误类型，用于日志与用户提示的一致性：

- `VALIDATION`
- `AUTH`
- `FORBIDDEN`
- `TIMEOUT`
- `RETRIEVAL_EMPTY`
- `EXTRACTION_FAILED`
- `REPORT_FAILED`
- `INTERNAL`

客户端仅返回安全消息；详细错误上下文仅写入日志（遵循零知识日志原则）。

### 5.2 降级与用户提示

- 检索为空：提示“未找到相关数据”，提供可操作建议（上传文档/调整年份）。
- 报告生成失败：明确失败原因类别 + 可重试提示。
- 提取失败：返回标准错误格式并记录错误原因。

---

## 6. 测试与回归策略

### 6.1 集成测试

每个 P0 流程至少包含：

- 1 条成功路径测试
- 1 条失败路径测试（验证错误分类 + 标准响应）

### 6.2 E2E 冒烟

最小化 E2E 覆盖：

- 报告生成
- 文档提取

### 6.3 质量门禁

- Lint / TypeScript / Unit Test / Integration / E2E 在 Phase 5 统一验证。
- 覆盖率报告由 v4.4 基础工具输出，不新增门槛。

---

## 7. 文案与 UI 一致性

聚焦 REQ-F1 的逐页修正清单，原则是“能力一致 + 表述克制”。

- Landing：去除装饰性动效与过度承诺
- Login：明确仅管理员入口
- Chat：显示明确配额
- About/Help：重写文案，移除不准确的模型/承诺

此部分不阻断稳定性指标，但必须避免误导性描述。

---

## 8. 数据模型与迁移

- **默认无数据库迁移**。
- 若必须持久化 workflow events，将在单独变更中引入新表（非 v4.5 必选）。

---

## 9. 回滚策略

- 新增日志字段向后兼容，回滚不影响业务功能。
- 若稳定性改动引发回归，可逐步关闭对应流程的增强逻辑并回退到原行为。

---

## 10. 安全与隐私

- 遵守零知识日志：仅记录结果、类型与上下文标识，不记录敏感输入。
- 统一使用 `createErrorResponse()` 返回错误结构。
- 所有外部输入继续使用 Zod 验证。

---

## 11. 风险与待确认事项

- v4.4 的 observability 实施细节需与 v4.6 指标口径对齐。
- 部分流程当前缺乏 `logRequest`/`logError` 覆盖，需要补齐。
- P95 目标需在 staging 上验证采样规模与统计口径。

---

## 12. 报告生成上下文增强（REQ-F2）

### 12.1 目标

在报告生成工作流的分析阶段注入公司档案与财务制度上下文，使 LLM 能够结合公司特性（IDM 模式、行业基准、内部标准）生成更有针对性的分析。

### 12.2 当前架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Report Generation Workflow                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ checkData    │ → │ gatherMetrics│ → │ gatherContext│ → │ analyze   │ │
│  │ Availability │   │   (22 tools) │   │  (current)   │   │ Sections  │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └───────────┘ │
│                                              │                    │      │
│                                              ▼                    ▼      │
│                                     ┌────────────────┐   ┌─────────────┐│
│                                     │ sourceDocuments│   │ LLM Prompt  ││
│                                     │ companyInfo    │   │ (无公司上下文)││
│                                     │ (仅文档名)      │   └─────────────┘│
│                                     └────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**问题**：
- `gatherContext` 仅获取 `公司章程` 的文档名，不获取内容
- `analyzeSections` 的 LLM prompt 不包含任何公司上下文
- 分析结果基于通用基准，缺乏针对性

### 12.3 目标架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Report Generation Workflow                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌───────────┐ │
│  │ checkData    │ → │ gatherMetrics│ → │ gatherContext│ → │ analyze   │ │
│  │ Availability │   │   (22 tools) │   │  (enhanced)  │   │ Sections  │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └───────────┘ │
│                                              │                    │      │
│                                              ▼                    ▼      │
│                                     ┌────────────────┐   ┌─────────────┐│
│                                     │ sourceDocuments│   │ LLM Prompt  ││
│                                     │ companyProfile │   │ + 公司上下文 ││
│                                     │ financialPolicy│   └─────────────┘│
│                                     │ (实际内容)      │                   │
│                                     └────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.4 数据流设计

#### 12.4.1 上下文文档定位

| 文档 | 定位方式 | 备选方案 |
|-----|---------|---------|
| `公司详细档案.md` | `doc_type = 'business_info'` + `name LIKE '%公司详细档案%'` | 按 `doc_type` 取最新 |
| `财务管理制度.md` | `doc_type = 'policy'` + `name LIKE '%财务管理制度%'` | 按 `doc_type` 取最新 |

#### 12.4.2 内容检索策略

**方案 A：直接从 document_chunks 拼接（推荐）**

```typescript
// 从 document_chunks 获取完整内容
const chunks = await supabase
  .from('document_chunks')
  .select('content, section_path')
  .eq('document_id', documentId)
  .order('section_path');

const fullContent = chunks.map(c => c.content).join('\n\n');
```

**优点**：
- 已有向量化内容，无需额外处理
- 支持未来按 section 精准检索

**方案 B：从 Storage 下载原文件**

不推荐：需要额外 I/O，且 Markdown 已被 chunker 处理过。

#### 12.4.3 内容截断策略

为避免上下文过长影响性能和成本：

| 文档 | 最大 token 数 | 截断策略 |
|-----|-------------|---------|
| `公司详细档案` | ~3000 tokens | 保留：实体属性、财务基准、业务结构、竞对对标 |
| `财务管理制度` | ~1500 tokens | 保留：附录 A（健康区间）、存货管理、应收账款管理 |

**实现**：在 `gather-context` 节点中使用简单字符截断（~12000 字符 ≈ 3000 tokens），或按 section 筛选关键章节。

### 12.5 状态 Schema 变更

```typescript
// src/lib/workflows/report/state.ts

interface ContextDocuments {
  companyInfo?: string;           // 保留兼容（已废弃）
  sourceDocuments: ReportSourceReference[];

  // 新增字段
  companyProfile?: string;        // 公司详细档案内容
  financialPolicy?: string;       // 财务管理制度内容
}
```

### 12.6 Prompt 注入设计

#### 12.6.1 Section Analysis Prompt 变更

```typescript
// src/lib/workflows/report/prompts.ts

export function buildSectionAnalysisPrompt(
  sectionId: ReportSectionId,
  sectionTitle: string,
  metrics: MetricResult[],
  comparisonMetrics: MetricResult[],
  year: string,
  comparisonYear?: string,
  companyContext?: {              // 新增参数
    companyProfile?: string;
    financialPolicy?: string;
  }
): string {
  // ... existing code ...

  // 新增上下文注入
  const contextSection = companyContext ? `
## 公司背景

${companyContext.companyProfile ? `### 公司档案摘要\n${companyContext.companyProfile}` : ''}

${companyContext.financialPolicy ? `### 财务管理基准\n${companyContext.financialPolicy}` : ''}

**分析要求**：请结合上述公司特性（行业、商业模式、内部基准）进行分析，避免使用通用行业标准进行简单对比。
` : '';

  return `你是一位专业的财务分析师...

${contextSection}

## 分析数据
...`;
}
```

#### 12.6.2 上下文使用指导

在 prompt 中明确指导 LLM 如何使用上下文：

```markdown
**分析要求**：
1. 使用公司档案中的行业基准（如 IDM 厂商存货周转 1.5-2.0x）而非通用制造业基准
2. 参考财务管理制度中的健康区间（附录 A）进行指标评价
3. 结合公司商业模式（IDM、电信+数通双轮驱动）解释异常值
4. 引用竞对对标数据进行横向比较（如适用）
```

### 12.7 降级策略

| 场景 | 处理方式 |
|-----|---------|
| 文档不存在 | 记录 warning，继续生成（无上下文注入） |
| 文档内容为空 | 同上 |
| 内容检索超时 | 设置 5s 超时，超时则跳过 |
| 内容过长 | 截断至最大限制，记录 info |

```typescript
// gather-context.ts
try {
  const companyProfile = await fetchDocumentContent('business_info', '公司详细档案');
  const financialPolicy = await fetchDocumentContent('policy', '财务管理制度');
} catch (error) {
  console.warn('Context fetch failed, proceeding without company context:', error);
  // 继续执行，companyProfile 和 financialPolicy 保持 undefined
}
```

### 12.8 性能预算

| 阶段 | 当前耗时 | 新增耗时 | 预算 |
|-----|---------|---------|------|
| gather-context | ~200ms | +300ms (2次 DB 查询) | < 500ms |
| analyze-sections (5 sections) | ~25s | +5s (更长 prompt) | < 35s |
| **总计** | ~40s | +5.3s | < 50s (P95 < 60s) |

**优化手段**：
- 两份文档并行查询
- 使用预处理/缓存的内容摘要（可选）

### 12.9 文件变更清单

| 文件 | 变更类型 | 说明 |
|-----|---------|------|
| `src/lib/workflows/report/state.ts` | 修改 | 新增 `companyProfile`, `financialPolicy` 字段 |
| `src/lib/workflows/report/nodes/gather-context.ts` | 修改 | 新增文档内容检索逻辑 |
| `src/lib/workflows/report/nodes/analyze-sections.ts` | 修改 | 传递上下文到 prompt 构建 |
| `src/lib/workflows/report/prompts.ts` | 修改 | 新增上下文注入逻辑 |

### 12.10 验收检查点

- [ ] `gather-context` 能成功检索两份文档内容
- [ ] 文档缺失时优雅降级，不阻断流程
- [ ] LLM prompt 包含公司上下文（可通过日志验证）
- [ ] 生成的报告分析体现公司特性
- [ ] 报告生成 P95 < 60s（性能不退化）

---

## 13. 报告输出格式调整（DOCX）

### 13.1 目标

- 报告生成默认输出并保存为 DOCX，满足用户二次编辑需求
- Supabase 存储、下载入口与文案统一为 DOCX（不再默认 PDF）

### 13.2 数据流

```
ReportContent → DOCX Generator → Supabase Storage → Signed URL → 下载/分享
```

**存储要求**：
- 文件扩展名：`.docx`
- Content-Type：`application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- 命名规则延续现有报告命名规范（仅调整扩展名）

### 13.3 数据模型

- 在 `reports` 表新增 `docx_storage_path`
- 保留 `pdf_storage_path` 仅用于历史数据兼容（不做批量迁移）
- API 与前端优先读取 `docx_storage_path`

### 13.4 兼容与降级策略

- 若 `docx_storage_path` 为空：提示“尚未生成 DOCX”，引导重新保存报告
- 旧 PDF 不回溯转换，避免引入额外迁移成本

### 13.5 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `supabase/migrations/*` | 新增 | 增加 `docx_storage_path` 字段 |
| `src/lib/reports/*` | 修改/新增 | 替换 PDF 生成/上传为 DOCX 生成/上传 |
| `src/app/api/reports/save/route.ts` | 修改 | 生成 DOCX 并保存路径 |
| `src/app/api/reports/[id]/docx/route.ts` | 新增 | 获取 DOCX 下载链接（替代 `/pdf`） |
| `src/hooks/useReportGeneration.ts` | 修改 | 保存逻辑与状态提示改为 DOCX |
| `src/components/reports/ReportActions.tsx` | 修改 | 保存与下载按钮文案/行为 |
| `src/components/documents/ReportsList.tsx` | 修改 | 下载入口与标签更新 |
| `src/types/report.ts` | 修改 | 添加 `docxStoragePath` 类型字段 |

### 13.6 验收检查点

- [ ] 新生成报告保存为 `.docx`，并可成功下载
- [ ] UI/接口描述不再出现 PDF 输出文案
- [ ] 旧报告无 DOCX 时给出清晰提示
- [ ] 报告生成性能仍满足 P95 < 60s
