# v4.2 报告生成系统 - Phase 1 PRD

> **版本**: v4.2
> **功能名称**: report-generation (财务分析报告生成)
> **文档类型**: PRD (Product Requirements Document)
> **创建日期**: 2026-01-08
> **修订日期**: 2026-01-08 (Rev.1 - 用户反馈修订)
> **状态**: ✅ 已批准 (2026-01-08)

---

## 1. 背景与动机

### 1.1 问题陈述

当前系统支持单次问答式的财务指标查询和计算，但缺乏生成综合性财务分析报告的能力：

| 问题 | 影响 |
|------|------|
| **无综合视图** | 用户需手动逐个查询各项指标，无法一键获取全面分析 |
| **分析分散** | 流动性、偿债能力、盈利能力等分析散落在多次对话中 |
| **无法输出** | 无法生成可保存、可导出的结构化报告 |
| **缺少对比** | 不支持年度对比分析 |

### 1.2 目标用户

- **财务分析师**：需要生成企业财务健康状况的综合分析报告
- **会计人员**：需要定期产出财务指标分析文档
- **管理层**：需要快速了解企业财务全貌

### 1.3 核心价值

**一键生成专业财务分析报告**：Agent 自主编排多个财务分析工具，收集数据、计算指标、分析趋势，最终生成结构化的专业报告。

### 1.4 设计灵感

参考业界 "Deep Research" Agent 的实现模式（[arxiv: Deep Research Agents](https://arxiv.org/html/2506.18096v2)）：

- **静态工作流**：预定义的阶段性任务管道（vs 动态自适应工作流）
- **Intent-to-Planning**：在执行前明确用户意图（选择年份、报告类型）
- **多阶段执行**：数据收集 → 指标计算 → 分析解读 → 报告生成

---

## 2. 用户故事

### US-001: 生成年度财务分析报告

**作为** 财务分析师
**我希望** 一键生成指定年度的综合财务分析报告
**以便** 快速获得企业财务健康状况的全面分析

**验收标准**:
- [ ] 可选择分析年份（从已上传数据的年份中选择）
- [ ] 报告包含流动性、偿债能力、盈利能力、运营效率四大板块
- [ ] 报告包含综合评价与建议
- [ ] 生成过程实时显示进度（复用 v4.0 过程透明化）

### US-002: 年度对比分析

**作为** 财务分析师
**我希望** 在报告中包含与上一年度的对比分析
**以便** 了解财务指标的变化趋势

**验收标准**:
- [ ] 可选择对比年份（可选）
- [ ] 指标显示同比变化（绝对值和百分比）
- [ ] 分析文字解读变化原因

### US-003: 保存并查看历史报告

**作为** 用户
**我希望** 生成的报告能被保存，并可在之后查看
**以便** 随时回顾历史分析结果

**验收标准**:
- [ ] 报告自动保存到数据库
- [ ] 报告列表页可查看历史报告
- [ ] 点击可查看完整报告内容

### US-004: 查看报告生成过程

**作为** 财务人员
**我希望** 看到报告生成时 Agent 调用了哪些工具、获取了哪些数据
**以便** 验证报告数据的准确性

**验收标准**:
- [ ] 报告生成时实时显示过程事件（复用 v4.0 ProcessLog 组件）
- [ ] 可展开查看每个指标的计算过程
- [ ] 显示数据来源链接

---

## 3. 功能需求

### 3.1 报告类型

**v4.2 范围**：仅支持"综合财务分析报告"一种类型

| 报告类型 | 描述 | 状态 |
|----------|------|------|
| `comprehensive_financial` | 综合财务分析报告 | v4.2 实现 |
| `dupont_analysis` | 杜邦分析专项报告 | 未来版本 |
| `risk_warning` | 财务风险预警报告 | 未来版本 |

### 3.2 报告结构

综合财务分析报告包含以下固定章节：

| 章节 | 标题 | 包含指标 |
|------|------|----------|
| **Section 1** | 流动性分析 | current_ratio, quick_ratio, cash_ratio, working_capital, cash_flow_ratio |
| **Section 2** | 偿债能力分析 | debt_to_asset_ratio, debt_to_equity_ratio, equity_multiplier, long_term_capital_debt_ratio, interest_coverage_ratio, cash_flow_interest_coverage, cash_flow_to_debt_ratio |
| **Section 3** | 盈利能力分析 | gross_profit_margin, net_profit_margin, return_on_assets, return_on_equity |
| **Section 4** | 运营效率分析 | asset_turnover, asset_turnover_days, inventory_turnover, receivables_turnover, working_capital_turnover |
| **Section 5** | 综合评价与建议 | 综合分析 + DuPont 分解 + 建议 |

### 3.3 工作流阶段

**架构关键决策**：Phase 2 (数据收集) 实现为 **Code Node**，直接在代码中并行执行预设函数，**不涉及 LLM 编排**。LLM 仅在 Phase 3 用于分析解读。这确保了 <60s 的性能目标。

```
┌─────────────────────────────────────────────────────────┐
│                    报告生成工作流                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Phase 1: 数据可用性检查 (Code Node)                      │
│  ├─ 查询 financial_data 表确认主年份数据是否存在            │
│  ├─ 若有对比年份，检查对比年份数据可用性                     │
│  ├─ 记录各年份可用的指标集合                                │
│  └─ 若主年份数据不足，返回错误提示                          │
│  └─ 若对比年份数据部分缺失，标记为 partialComparison        │
│                                                         │
│  Phase 2: 数据收集 (Code Node - 并行执行)                  │
│  ├─ 对主年份 (year) 并行执行全部 21 个预设函数               │
│  ├─ 若有对比年份 (comparisonYear)，同样并行执行全部函数     │
│  ├─ 收集每个指标的源文档 ID (document_id) 用于溯源          │
│  └─ 计算同比变化值 (若对比数据可用)                         │
│  注：此阶段无 LLM 参与，纯代码执行                          │
│                                                         │
│  Phase 3: 分析解读 (LLM Node - 分章节处理)                  │
│  ├─ 3.1 分析流动性章节 → 生成 Section 1 分析文字            │
│  ├─ 3.2 分析偿债能力章节 → 生成 Section 2 分析文字          │
│  ├─ 3.3 分析盈利能力章节 → 生成 Section 3 分析文字          │
│  ├─ 3.4 分析运营效率章节 → 生成 Section 4 分析文字          │
│  └─ 3.5 综合分析 (输入: Sections 1-4) → 生成 Section 5     │
│  注：分章节调用 LLM，防止上下文丢失                          │
│                                                         │
│  Phase 4: 报告生成 (Code Node)                            │
│  ├─ 组装各章节内容为 ReportContent                         │
│  ├─ 汇总源文档引用                                         │
│  └─ 保存到 reports 表                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**关于对比年份数据不完整的处理**：
- 若对比年份 (comparisonYear) 数据完整 → 正常显示变化值
- 若对比年份部分指标缺失 → 该指标 change 显示 "N/A (数据不足)"
- 若对比年份完全无数据 → 降级为单年度报告，不显示变化列

### 3.4 报告内容结构

```typescript
interface ReportContent {
  title: string;                    // "2024年度财务综合分析报告"
  generatedAt: string;              // ISO 时间戳
  year: string;                     // "2024"
  comparisonYear?: string;          // "2023"

  sections: ReportSection[];        // 5 个章节

  summary: {
    keyFindings: string[];          // 关键发现（3-5 条）
    riskWarnings: string[];         // 风险警示（0-3 条）
    recommendations: string[];      // 改进建议（3-5 条）
  };
}

interface ReportSection {
  id: string;                       // 'liquidity', 'solvency', etc.
  title: string;                    // '流动性分析'
  metrics: ReportMetric[];          // 该章节的指标列表
  analysis: string;                 // LLM 生成的分析文字
  sourceDocuments: SourceReference[];
}

interface ReportMetric {
  name: string;                     // '流动比率'
  toolName: string;                 // 'current_ratio' - 用于溯源
  value: number;                    // 2.15
  formatted: string;                // "2.15倍"
  previousValue?: number;           // 1.87 (对比年份)
  change?: string;                  // "+14.97%" 或 "N/A (数据不足)"
  interpretation?: string;          // "高于行业平均水平，短期偿债能力良好"
  warnings?: string[];              // ["低于安全线 2.0"]
  sourceDocumentIds?: string[];     // 计算此指标所用数据的源文档 ID
}

/**
 * Change 计算规则（本期采用相对变化率 %，保持一致性）:
 *
 * 对于绝对值指标（如营运资本）:
 *   change = ((current - previous) / |previous|) * 100%
 *   例: 100万 → 120万 = "+20.00%"
 *
 * 对于比率指标（如毛利率 20% → 25%）:
 *   change = ((current - previous) / |previous|) * 100%
 *   例: 0.20 → 0.25 = "+25.00%"
 *
 * 注：未来版本可考虑为比率指标显示绝对变化 (如 "+5pp")，
 * 但本期统一使用相对变化率以保持一致性。
 */
```

### 3.5 UI 交互流程

```
┌──────────────────────────────────────────────────────────────┐
│  Sidebar                                                     │
│  ┌────────────────────────────────┐                          │
│  │ 📊 生成报告                     │  ← 点击打开 Modal        │
│  └────────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  ReportModal                                                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  生成财务分析报告                                        │  │
│  │                                                        │  │
│  │  分析年份: [2024 ▼]                                     │  │
│  │  对比年份: [2023 ▼] (可选)                               │  │
│  │                                                        │  │
│  │  [生成报告]                                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  生成中状态                                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ⏳ 正在生成报告...                                      │  │
│  │                                                        │  │
│  │  ▼ 生成过程                                             │  │
│  │  ├─ ✓ 检查数据可用性                                    │  │
│  │  ├─ ✓ 收集流动性指标                                    │  │
│  │  ├─ ⏳ 收集偿债能力指标...                               │  │
│  │  ├─ ○ 收集盈利能力指标                                  │  │
│  │  ├─ ○ 收集运营效率指标                                  │  │
│  │  ├─ ○ 分析数据                                         │  │
│  │  └─ ○ 生成报告                                         │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  ReportViewer                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📊 2024年度财务综合分析报告                              │  │
│  │  生成时间: 2026-01-08 14:30                             │  │
│  │                                                        │  │
│  │  [执行摘要]                                             │  │
│  │  • 企业整体财务状况良好，流动性充裕...                    │  │
│  │                                                        │  │
│  │  ▼ 一、流动性分析                                       │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 流动比率: 2.15倍 (+14.97% vs 2023)               │  │  │
│  │  │ 速动比率: 1.82倍 (+10.30% vs 2023)               │  │  │
│  │  │ ...                                              │  │  │
│  │  │                                                  │  │  │
│  │  │ 分析: 公司流动性指标均表现良好，流动比率...        │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                        │  │
│  │  ▶ 二、偿债能力分析                                     │  │
│  │  ▶ 三、盈利能力分析                                     │  │
│  │  ▶ 四、运营效率分析                                     │  │
│  │  ▶ 五、综合评价与建议                                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.6 SSE 事件格式

报告生成 API 采用 SSE 流式传输，事件类型：

```typescript
// 阶段进度事件
interface PhaseEvent {
  type: 'phase';
  data: {
    phase: 'check' | 'gather' | 'analyze' | 'generate';
    status: 'started' | 'completed';
    progress: number;  // 0-100
  };
}

// 过程事件（复用 v4.0 ProcessEvent）
interface ProcessEventSSE {
  type: 'process';
  data: ProcessEvent;
}

// 章节完成事件
interface SectionEvent {
  type: 'section';
  data: {
    sectionId: string;
    status: 'generating' | 'completed';
    content?: ReportSection;
  };
}

// 完成事件
interface CompleteEvent {
  type: 'complete';
  data: {
    reportId: string;
    content: ReportContent;
  };
}

// 错误事件
interface ErrorEvent {
  type: 'error';
  data: {
    message: string;
    phase?: string;
  };
}
```

---

## 4. 非功能需求

### 4.1 性能

| 指标 | 目标 |
|------|------|
| 报告生成时间 | < 60 秒（典型场景） |
| 首个事件响应 | < 2 秒 |
| SSE 事件延迟 | < 100ms |

### 4.2 可靠性

| 场景 | 处理方式 |
|------|----------|
| 部分指标计算失败 | 继续生成，标记该指标为"数据不足" |
| LLM 分析超时 | 重试一次，仍失败则使用模板文字 |
| 数据库保存失败 | 返回报告内容，提示保存失败 |

### 4.3 持久化

| 规则 | 说明 |
|------|------|
| 用户报告 | 永久保存 |
| 访客报告 | 保存 7 天后自动清理 |
| 报告内容 | 完整 JSON 存储在 `content` 字段 |

---

## 5. 范围界定

### 5.1 本期范围内 (In Scope)

- [x] 综合财务分析报告类型
- [x] 固定 5 章节模板结构
- [x] 单年度 / 双年度对比分析
- [x] 报告持久化存储
- [x] 报告历史列表
- [x] 生成过程透明化（复用 v4.0）
- [x] Modal 触发式 UI

### 5.2 本期范围外 (Out of Scope)

| 功能 | 说明 | 计划版本 |
|------|------|----------|
| 自定义报告模板 | 用户选择包含哪些章节 | v4.x |
| 报告导出 | 导出为 PDF/Word | v4.x |
| 多公司对比 | 对比不同公司的财务指标 | v4.x |
| 杜邦分析专项报告 | 专门的 ROE 分解报告 | v4.5 |
| 风险预警报告 | 自动识别财务风险 | v4.x |
| 报告分享 | 生成分享链接 | v4.x |

### 5.3 技术约束

| 约束 | 说明 |
|------|------|
| LangGraph 工作流 | 使用独立的报告工作流图，不扩展统一工作流 |
| 预设工具复用 | 复用现有 22 个预设财务计算工具 |
| SSE 流式 | 复用现有 SSE 基础设施 |
| 过程透明化 | 复用 v4.0 ProcessLog 组件和 ProcessEvent 类型 |

### 5.4 假设与约束

| 假设/约束 | 说明 |
|-----------|------|
| **日历年度** | 本期仅支持日历年度 (Calendar Year)，年份对应数据库中 `period` 字段的年份部分。不支持财务年度 (Fiscal Year) 的跨年度处理。 |
| **单公司数据** | 报告基于当前用户上传的文档数据，不支持跨公司/跨组织对比。 |
| **数据完整性** | 若某指标所需的基础数据不存在，该指标标记为 "数据不足"，不阻断报告生成。 |
| **LLM 依赖** | Phase 3 分析依赖 OpenAI GPT-4o，若 API 不可用则分析章节使用占位文字。 |

---

## 6. 数据库设计

### 6.1 新增表：reports

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 所有权
    owner_id UUID,
    owner_type VARCHAR(20) NOT NULL DEFAULT 'guest'
        CHECK (owner_type IN ('system', 'admin', 'user', 'guest')),

    -- 报告元数据
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'completed', 'failed')),

    -- 输入参数
    year VARCHAR(4) NOT NULL,
    comparison_year VARCHAR(4),

    -- 报告内容
    content JSONB NOT NULL DEFAULT '{}',
    -- summary_text: 用于列表页展示，避免加载完整 JSON
    summary_text TEXT,

    -- 生成元数据
    generation_time_ms INTEGER,
    error_message TEXT,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_reports_owner ON reports(owner_id, owner_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_expires ON reports(expires_at) WHERE expires_at IS NOT NULL;

-- 幂等性: 防止重复生成
-- 同一用户、同一年份、同一报告类型、正在生成中的报告只能有一个
CREATE UNIQUE INDEX idx_reports_generating_unique
    ON reports(owner_id, owner_type, year, comparison_year, report_type)
    WHERE status = 'generating';
```

**字段精简说明**：
- 移除 `document_ids`：源文档信息已包含在 `content.sections[].sourceDocuments` 中
- 移除 `metrics_used`：指标信息已包含在 `content.sections[].metrics` 中
- 移除 `data_sources`：与 `sourceDocuments` 重复
- 新增 `summary_text`：存储执行摘要，用于列表页展示，避免反序列化完整 JSON

### 6.2 RLS 策略

```sql
-- 启用 RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的报告
CREATE POLICY "users_own_reports" ON reports
    FOR ALL
    USING (owner_id = auth.uid() OR owner_type = 'guest');
```

---

## 7. API 设计

### 7.1 生成报告

```
POST /api/reports/generate
Content-Type: application/json
Accept: text/event-stream

Request:
{
    "year": "2024",
    "comparisonYear": "2023"  // 可选
}

Response: SSE 流

幂等性处理:
- 若已存在相同参数 (year + comparisonYear + report_type) 且 status='generating' 的报告
  → 返回 409 Conflict: { error: "REPORT_ALREADY_GENERATING", existingReportId: "..." }
- 客户端应在按钮点击后立即禁用按钮，防止重复请求
- 数据库唯一索引作为最后防线，确保不会创建重复的生成中报告
```

### 7.2 获取报告列表

```
GET /api/reports

Response:
{
    "success": true,
    "data": {
        "reports": [
            {
                "id": "uuid",
                "title": "2024年度财务综合分析报告",
                "year": "2024",
                "comparisonYear": "2023",
                "status": "completed",
                "summaryText": "企业整体财务状况良好，流动性充裕...",  // 用于列表预览
                "createdAt": "2026-01-08T14:30:00Z"
            }
        ]
    }
}

注: summaryText 来自数据库 summary_text 字段，避免反序列化完整 content JSON
```

### 7.3 获取单个报告

```
GET /api/reports/:id

Response:
{
    "success": true,
    "data": {
        "report": {
            "id": "uuid",
            "title": "2024年度财务综合分析报告",
            "year": "2024",
            "comparisonYear": "2023",
            "content": ReportContent,  // 完整报告内容，含 sections 和 summary
            "generationTimeMs": 42000,
            "createdAt": "2026-01-08T14:30:00Z"
        }
    }
}

注: content 内已包含所有指标 (sections[].metrics) 和源文档 (sections[].sourceDocuments)，
无需单独返回 metricsUsed 或 dataSources
```

---

## 8. 成功指标

| 指标 | 目标 |
|------|------|
| 报告生成成功率 | > 95%（假设数据完整） |
| 平均生成时间 | < 45 秒 |
| 用户满意度 | 报告内容准确、分析有价值 |
| 系统稳定性 | 无内存泄漏、无崩溃 |

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 部分指标数据缺失 | 报告不完整 | 标记为"数据不足"，不阻断生成 |
| LLM 分析质量不稳定 | 分析文字质量参差 | 使用结构化 prompt，限制输出格式 |
| 报告生成时间过长 | 用户体验差 | 并行执行独立的数据收集任务 |
| 访客滥用 | 资源消耗 | 复用现有 guest rate limiter |

---

## 10. 相关文档

- [v4 开发计划](../../v4_DEVELOPMENT_PLAN.md)
- [v4.0 过程透明化 PRD](../process-transparency/PHASE1_PRD.md)
- [Phase 2 设计文档](./PHASE2_DESIGN.md) (待创建)

---

*文档创建: 2026-01-08*
*状态: 待审批*
