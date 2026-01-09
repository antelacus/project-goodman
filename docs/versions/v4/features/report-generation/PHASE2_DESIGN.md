# v4.2 报告生成系统 - Phase 2 设计文档

> **版本**: v4.2
> **功能名称**: report-generation (财务分析报告生成)
> **文档类型**: 设计文档 (Design Document)
> **创建日期**: 2026-01-09
> **状态**: 设计完成

---

## 目录

1. [架构概览](#1-架构概览)
2. [数据模型设计](#2-数据模型设计)
3. [工作流设计](#3-工作流设计)
4. [API 设计](#4-api-设计)
5. [组件设计](#5-组件设计)
6. [文件组织](#6-文件组织)
7. [依赖管理](#7-依赖管理)
8. [风险与缓解](#8-风险与缓解)

---

## 1. 架构概览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              前端 (React)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  ChatInput          ChatWorkspace           DocumentsPage               │
│  (工具菜单)          (报告渲染)              (报告列表)                    │
│      │                   │                       │                       │
│      └───────────────────┴───────────────────────┘                       │
│                          │                                               │
│              useReportGeneration (SSE Hook)                              │
└─────────────────────────────────────────────────────────────────────────┘
                           │ SSE
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API 层 (Next.js)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/reports/generate   /api/reports/save   /api/reports   /api/reports/[id] │
│        (SSE)                 (POST)             (GET)           (GET)    │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        报告工作流 (LangGraph)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  checkDataAvailability → gatherMetrics → gatherContext                  │
│           │                                    │                         │
│           ▼                                    ▼                         │
│       [Error?] ─────────────────────→ analyzeSections (LLM)             │
│                                              │                           │
│                                              ▼                           │
│                                       assembleReport                     │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据层                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL)          Supabase Storage          ToolRegistry  │
│  - reports 表                   - report-files bucket     - 22 预设工具  │
│  - financial_data 表            - PDF 存储                               │
│  - documents 表                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 工作流架构 | 独立 LangGraph 图 | 与统一工作流解耦，便于独立演进和测试 |
| 数据收集 | Code Node (无 LLM) | 并行执行 21 个工具，确保 < 60s 性能目标 |
| LLM 参与 | 仅 Phase 3 分析 | 减少 LLM 调用次数，降低成本和延迟 |
| PDF 库 | `@react-pdf/renderer` | React 风格 API，良好的中文字体支持 |
| 报告展示 | 聊天区域渲染 | 对话式 UX，符合 PRD 要求 |

---

## 2. 数据模型设计

### 2.1 数据库表：reports

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 所有权（复用现有模式）
    owner_id UUID,
    owner_type VARCHAR(20) NOT NULL DEFAULT 'guest'
        CHECK (owner_type IN ('system', 'admin', 'user', 'guest')),

    -- 报告元数据
    title VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL DEFAULT 'comprehensive_financial',

    -- 输入参数
    year VARCHAR(4) NOT NULL,
    comparison_year VARCHAR(4),

    -- 报告内容
    content JSONB NOT NULL DEFAULT '{}',
    summary_text TEXT,

    -- PDF 存储
    pdf_storage_path TEXT,

    -- 生成元数据
    generation_time_ms INTEGER,

    -- 时间戳
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_reports_owner ON reports(owner_id, owner_type);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_expires ON reports(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_reports" ON reports
    FOR ALL
    USING (owner_type = 'system' OR owner_id = auth.uid());
```

### 2.2 TypeScript 类型定义

```typescript
// src/types/report.ts

/**
 * 完整报告内容结构
 */
export interface ReportContent {
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

/**
 * 报告章节
 */
export interface ReportSection {
  id: string;                       // 'liquidity', 'solvency', etc.
  title: string;                    // '流动性分析'
  metrics: ReportMetric[];          // 该章节的指标列表
  analysis: string;                 // LLM 生成的分析文字
  sourceDocuments: SourceReference[];
}

/**
 * 单个指标
 */
export interface ReportMetric {
  name: string;                     // '流动比率'
  toolName: string;                 // 'current_ratio'
  value: number;                    // 2.15
  formatted: string;                // "2.15倍"
  previousValue?: number;           // 1.87 (对比年份)
  change?: string;                  // "+14.97%" 或 "N/A (数据不足)"
  interpretation?: string;          // 简短解读
  warnings?: string[];              // 警示信息
  sourceDocumentIds?: string[];     // 数据来源文档 ID
}

/**
 * 数据来源引用
 */
export interface SourceReference {
  documentId: string;
  documentName: string;
  documentType: string;
  year?: string;
  period?: string;
  fileUrl?: string;
}
```

### 2.3 SSE 事件类型

```typescript
// src/types/report-events.ts

/**
 * 阶段进度事件
 */
export interface ReportPhaseEvent {
  type: 'phase';
  data: {
    phase: 'check' | 'gather' | 'analyze' | 'generate';
    status: 'started' | 'completed';
    progress?: number;
  };
}

/**
 * 章节完成事件
 */
export interface ReportSectionEvent {
  type: 'section';
  data: {
    sectionId: string;
    status: 'generating' | 'completed';
    content?: ReportSection;
  };
}

/**
 * 完成事件
 */
export interface ReportCompleteEvent {
  type: 'complete';
  data: {
    reportId: string;
    content: ReportContent;
  };
}

/**
 * 错误事件
 */
export interface ReportErrorEvent {
  type: 'error';
  data: {
    message: string;
    phase?: string;
  };
}

/**
 * 所有事件类型联合
 */
export type ReportSSEEvent =
  | ReportPhaseEvent
  | ReportSectionEvent
  | ReportCompleteEvent
  | ReportErrorEvent;
```

---

## 3. 工作流设计

### 3.1 工作流状态

```typescript
// src/lib/workflows/report/state.ts

export interface ReportWorkflowState {
  // 输入
  input: {
    year: string;
    comparisonYear?: string;
    ownerId: string;
    ownerType: 'admin' | 'user' | 'guest';
  };

  // Phase 1: 数据可用性
  dataAvailability: {
    primaryYearAvailable: boolean;
    comparisonYearAvailable: boolean;
    partialComparison: boolean;
    status: 'pending' | 'checking' | 'checked' | 'error';
    error?: string;
  };

  // Phase 2: 指标数据
  metricResults: {
    primary: Map<string, MetricResult>;
    comparison: Map<string, MetricResult>;
    status: 'pending' | 'gathering' | 'gathered' | 'error';
  };

  // Phase 2b: 上下文文档
  contextDocuments: {
    companyInfo?: string;
    regulations?: string[];
    accountingStandards?: string[];
  };

  // Phase 3: 章节分析
  sections: ReportSectionData[];

  // Phase 4: 最终报告
  report?: ReportContent;

  // 元数据
  meta: {
    startTime: number;
    currentPhase: 1 | 2 | 3 | 4;
    error?: Error;
  };
}
```

### 3.2 工作流图定义

```typescript
// src/lib/workflows/report/graph.ts

import { StateGraph, START, END } from "@langchain/langgraph";
import { ReportWorkflowState } from "./state";
import {
  checkDataAvailabilityNode,
  gatherMetricsNode,
  gatherContextNode,
  analyzeSectionsNode,
  assembleReportNode
} from "./nodes";
import { shouldProceed } from "./edges";

const workflow = new StateGraph<ReportWorkflowState>({
  channels: {
    input: { value: (l, r) => r ?? l, default: () => ({}) },
    dataAvailability: { value: (l, r) => r ?? l, default: () => ({ status: 'pending' }) },
    metricResults: { value: (l, r) => r ?? l, default: () => ({ status: 'pending' }) },
    contextDocuments: { value: (l, r) => r ?? l, default: () => ({}) },
    sections: { value: (l, r) => r ?? l, default: () => [] },
    report: { value: (l, r) => r ?? l, default: () => undefined },
    meta: { value: (l, r) => r ?? l, default: () => ({ startTime: 0, currentPhase: 1 }) },
  },
});

// 添加节点
workflow.addNode("checkDataAvailability", checkDataAvailabilityNode);
workflow.addNode("gatherMetrics", gatherMetricsNode);
workflow.addNode("gatherContext", gatherContextNode);
workflow.addNode("analyzeSections", analyzeSectionsNode);
workflow.addNode("assembleReport", assembleReportNode);

// 添加边
workflow.addEdge(START, "checkDataAvailability");
workflow.addConditionalEdges(
  "checkDataAvailability",
  shouldProceed,
  { proceed: "gatherMetrics", error: END }
);
workflow.addEdge("gatherMetrics", "gatherContext");
workflow.addEdge("gatherContext", "analyzeSections");
workflow.addEdge("analyzeSections", "assembleReport");
workflow.addEdge("assembleReport", END);

export const reportWorkflowGraph = workflow.compile();
```

### 3.3 节点实现要点

#### checkDataAvailabilityNode (Phase 1)
- 查询 `financial_data` 表确认主年份数据存在
- 检查对比年份数据可用性（若指定）
- 若主年份数据不足，返回错误

#### gatherMetricsNode (Phase 2)
- 使用 `Promise.all()` 并行执行 21 个预设工具
- 对主年份和对比年份分别执行
- 计算同比变化值
- 收集源文档 ID 用于溯源

#### gatherContextNode (Phase 2b)
- 检索公司基本情况文档
- 检索相关法规和会计准则
- 为 LLM 分析提供上下文

#### analyzeSectionsNode (Phase 3)
- 按章节顺序调用 LLM
- 每章节独立生成分析文字
- Section 5 综合前 4 章节内容

#### assembleReportNode (Phase 4)
- 组装 ReportContent 结构
- 提取关键发现和建议
- 返回最终报告

### 3.4 报告章节配置

```typescript
// src/lib/workflows/report/constants.ts

export const REPORT_SECTIONS = [
  {
    id: 'liquidity',
    title: '流动性分析',
    metrics: [
      'current_ratio',
      'quick_ratio',
      'cash_ratio',
      'working_capital',
      'cash_flow_ratio'
    ]
  },
  {
    id: 'solvency',
    title: '偿债能力分析',
    metrics: [
      'debt_to_asset_ratio',
      'debt_to_equity_ratio',
      'equity_multiplier',
      'long_term_capital_debt_ratio',
      'interest_coverage_ratio',
      'cash_flow_interest_coverage',
      'cash_flow_to_debt_ratio'
    ]
  },
  {
    id: 'profitability',
    title: '盈利能力分析',
    metrics: [
      'gross_profit_margin',
      'net_profit_margin',
      'return_on_assets',
      'return_on_equity'
    ]
  },
  {
    id: 'efficiency',
    title: '运营效率分析',
    metrics: [
      'asset_turnover',
      'asset_turnover_days',
      'inventory_turnover',
      'receivables_turnover',
      'working_capital_turnover'
    ]
  },
  {
    id: 'comprehensive',
    title: '综合评价与建议',
    metrics: ['dupont_roe']  // 杜邦分析作为综合评价基础
  }
];

// 总计 21 个指标（不含 dupont_roe，它用于综合分析）
export const TOTAL_METRICS_COUNT = 21;
```

---

## 4. API 设计

### 4.1 POST /api/reports/generate

生成报告，返回 SSE 流。

**请求**:
```typescript
{
  year: string;           // 必需，主分析年份
  comparisonYear?: string; // 可选，对比年份
}
```

**响应**: SSE 流，事件类型见 3.3 节

### 4.2 POST /api/reports/save

保存报告并生成 PDF。

**请求**:
```typescript
{
  content: ReportContent;  // 完整报告内容
  year: string;
  comparisonYear?: string;
}
```

**响应**:
```typescript
{
  success: true,
  data: {
    reportId: string;
    pdfUrl: string;       // 签名 URL，1 小时有效
  }
}
```

### 4.3 GET /api/reports

获取用户报告列表。

**响应**:
```typescript
{
  success: true,
  data: {
    reports: Array<{
      id: string;
      title: string;
      year: string;
      comparisonYear?: string;
      summaryText: string;
      createdAt: string;
    }>
  }
}
```

### 4.4 GET /api/reports/[id]

获取单个报告详情。

**响应**:
```typescript
{
  success: true,
  data: {
    report: {
      id: string;
      title: string;
      year: string;
      comparisonYear?: string;
      content: ReportContent;
      pdfStoragePath: string;
      generationTimeMs: number;
      createdAt: string;
    }
  }
}
```

### 4.5 GET /api/reports/[id]/pdf

获取 PDF 签名 URL。

**响应**:
```typescript
{
  success: true,
  data: {
    url: string;  // 签名 URL，1 小时有效
  }
}
```

---

## 5. 组件设计

### 5.1 组件层次结构

```
ChatWorkspace
├── MessageList
│   └── ReportMessage (报告消息)
│       ├── ReportSummary (执行摘要)
│       ├── ReportSection (可折叠章节) ×5
│       │   └── MetricTable (指标表格)
│       └── ReportActions (保存/导出按钮)
├── ReportProgress (生成进度，生成中显示)
└── ChatInput
    └── ToolsMenu (工具菜单，含"生成报告")

DocumentsPage
└── ReportsList (分析报告列表)
```

### 5.2 ReportMessage 组件

主报告展示组件，在聊天区域渲染完整报告。

```typescript
interface ReportMessageProps {
  report: ReportContent;
  onSave?: () => void;
  isSaving?: boolean;
  savedPdfUrl?: string;
}
```

**功能**:
- 显示报告标题和生成时间
- 执行摘要（关键发现、风险警示、建议）
- 5 个可折叠章节
- 保存/导出按钮

### 5.3 ReportSection 组件

可折叠的报告章节。

```typescript
interface ReportSectionProps {
  section: ReportSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasComparison: boolean;
  comparisonYear?: string;
}
```

**功能**:
- 点击展开/折叠
- 指标表格（名称、数值、对比值、变化）
- 分析文字
- 数据来源链接

### 5.4 ReportProgress 组件

报告生成进度指示器。

```typescript
interface ReportProgressProps {
  phases: Array<{
    id: string;
    label: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  currentSection?: string;
}
```

### 5.5 useReportGeneration Hook

管理报告生成状态和 SSE 流。

```typescript
interface UseReportGenerationReturn {
  // 状态
  isGenerating: boolean;
  phases: PhaseStatus[];
  sections: ReportSection[];
  report: ReportContent | null;
  error: string | null;

  // 操作
  startGeneration: (year: string, comparisonYear?: string) => Promise<void>;
  saveReport: () => Promise<{ reportId: string; pdfUrl: string }>;
  reset: () => void;
}
```

---

## 6. 文件组织

### 6.1 新增文件

```
src/
├── app/api/reports/
│   ├── generate/route.ts          # POST - SSE 生成
│   ├── save/route.ts              # POST - 保存报告
│   ├── route.ts                   # GET - 报告列表
│   └── [id]/
│       ├── route.ts               # GET - 单个报告
│       └── pdf/route.ts           # GET - PDF URL

├── components/reports/
│   ├── index.ts                   # Barrel export
│   ├── ReportMessage.tsx          # 报告消息组件
│   ├── ReportSection.tsx          # 可折叠章节
│   ├── ReportSummary.tsx          # 执行摘要
│   ├── ReportProgress.tsx         # 生成进度
│   └── ReportActions.tsx          # 操作按钮

├── components/documents/
│   └── ReportsList.tsx            # 报告列表组件

├── hooks/
│   └── useReportGeneration.ts     # 报告生成 Hook

├── lib/workflows/report/
│   ├── graph.ts                   # LangGraph 工作流
│   ├── state.ts                   # 状态类型
│   ├── edges.ts                   # 条件边
│   ├── constants.ts               # 章节配置
│   ├── prompts.ts                 # LLM 提示词
│   └── nodes/
│       ├── index.ts
│       ├── check-data-availability.ts
│       ├── gather-metrics.ts
│       ├── gather-context.ts
│       ├── analyze-sections.ts
│       └── assemble-report.ts

├── lib/reports/
│   ├── index.ts
│   └── pdf-generator.tsx          # PDF 生成

├── types/
│   ├── report.ts                  # 报告类型
│   └── report-events.ts           # SSE 事件类型

supabase/migrations/
└── 20260109000000_add_reports_table.sql
```

### 6.2 需修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/chat/ChatInput.tsx` | 添加"工具"下拉菜单和"生成报告"选项 |
| `src/components/chat/ChatWorkspace.tsx` | 处理报告模式状态，渲染 ReportMessage |
| `src/components/chat/MessageList.tsx` | 检测报告类型并渲染 |
| `src/app/(workspace)/documents/page.tsx` | 添加"分析报告"区域 |
| `src/lib/validation/api-schemas.ts` | 添加报告相关 Schema |
| `src/lib/database/types.ts` | 添加 reports 表类型（自动生成） |

---

## 7. 依赖管理

### 7.1 新增依赖

```bash
npm install @react-pdf/renderer
```

**选择理由**:
- React 风格 API，与现有组件模式一致
- 良好的中文字体支持（Noto Sans SC）
- 服务端渲染兼容
- 活跃维护

### 7.2 复用依赖

| 依赖 | 用途 |
|------|------|
| `@langchain/langgraph` | 工作流图 |
| `openai` | LLM 分析 |
| `@supabase/supabase-js` | 数据库和存储 |
| `zod` | 请求验证 |

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| LLM 分析质量不稳定 | 分析文字质量参差不齐 | 使用结构化提示词，限制输出格式；必要时使用模板文字 |
| PDF 生成耗时 | 用户等待时间长 | 先返回报告内容，PDF 异步生成 |
| 工具执行失败 | 报告数据不完整 | 继续生成，将失败指标标记为"数据不足" |
| 大报告内存占用 | 服务器压力 | 限制报告大小，PDF 分页处理 |
| 访客滥用 | 资源消耗 | 复用现有 guest rate limiter |

---

## 附录：SSE 事件流示例

```
Time    Event                           说明
──────────────────────────────────────────────────────────────
0ms     phase: check/started            开始检查数据
500ms   phase: check/completed          数据检查完成
        phase: gather/started           开始收集指标
1s      process: tool_call/current_ratio  调用流动比率工具
1.5s    process: tool_result/2.15倍      流动比率结果
...     (21 个工具调用)
15s     phase: gather/completed         指标收集完成
        phase: analyze/started          开始分析
20s     section: liquidity/completed    流动性分析完成
25s     section: solvency/completed     偿债能力分析完成
30s     section: profitability/completed 盈利能力分析完成
35s     section: efficiency/completed   运营效率分析完成
40s     section: comprehensive/completed 综合评价完成
        phase: analyze/completed        分析完成
        phase: generate/started         生成报告
42s     phase: generate/completed       报告生成完成
        complete: { reportId, content } 返回完整报告
```

---

*文档创建: 2026-01-09*
*状态: 设计完成，待实现*
