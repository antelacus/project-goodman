# v4.1 工具体系精简 - Phase 2 设计文档

## 概述

本文档详细描述 v4.1 工具体系精简的技术设计方案。

---

## 1. 架构变更

### 1.1 工具变更总览

| 工具 | 操作 | 说明 |
|------|------|------|
| `get_financial_metric` | 删除 | 功能合并到 query_financial_data |
| `query_financial_data` | 增强 | 支持多年份查询，新输出格式 |
| `calculate_financial_metric` | 删除 | 冗余（预设工具已覆盖） |
| `evaluate_expression` | 保留 | 无变更 |

### 1.2 数据流变更

```
Before (3 tools for financial data):
┌─────────────────────────────┐
│   get_financial_metric      │─── 单指标多年份 ───┐
└─────────────────────────────┘                    │
┌─────────────────────────────┐                    ▼
│   query_financial_data      │─── 多指标单年份 ───► financial_data 表
└─────────────────────────────┘                    ▲
┌─────────────────────────────┐                    │
│  calculate_financial_metric │─── 手动计算 ───────┘
└─────────────────────────────┘

After (1 enhanced tool):
┌─────────────────────────────┐
│   query_financial_data      │─── 多指标多年份 ───► financial_data 表
│      (enhanced)             │
└─────────────────────────────┘
```

---

## 2. query_financial_data 增强设计

### 2.1 输入 Schema 变更

**现有 Schema**:
```typescript
QueryFinancialDataInputSchema = z.object({
  metric_names: z.array(z.string()),
  year: z.string().optional(),        // 单年份
  period: z.string().optional(),
});
```

**新 Schema**:
```typescript
QueryFinancialDataInputSchema = z.object({
  metric_names: z.array(z.string()),
  years: z.array(z.string()).optional(),  // 多年份数组
  period: z.string().optional(),
});
```

**向后兼容**：`years` 为可选，不传时返回所有可用年份的最新数据。

### 2.2 输出 Schema 变更

**现有 Schema**:
```typescript
// Record 格式，按 metric_name 分组
{
  metrics: {
    "资产总计": { value: 1000000, unit: "元", source: "..." },
    "负债总计": { value: 600000, unit: "元", source: "..." }
  }
}
```

**新 Schema（扁平列表格式）**:
```typescript
QueryFinancialDataOutputSchema = z.object({
  results: z.array(z.object({
    year: z.string(),
    metric: z.string(),
    value: z.number(),
    unit: z.string(),
    source: z.string(),
    period: z.string(),
  })),
  missing: z.array(z.string()),  // 未找到的指标
});
```

**设计理由**：
1. 扁平列表更适合 LLM 解析（避免嵌套 Map 结构的 token 逻辑错误）
2. 每条记录包含完整上下文（year、metric、value）
3. `missing` 字段明确标识未找到的指标

### 2.3 实现策略

**数据库调用处理**：

现有 `queryFinancialData` 函数支持单年份过滤。对于多年份查询，有两种方案：

**方案 A: 循环调用（推荐）**
```typescript
const yearsToQuery = input.years || [getCurrentYear()]; // 无 years 参数时使用当前年份
const allResults: ResultItem[] = [];
const foundMetrics = new Set<string>();

for (const year of yearsToQuery) {
  const data = await queryFinancialData(metric_names, year, period);
  data.forEach(d => {
    allResults.push({
      year: d.year,
      metric: d.metric_name,
      value: d.metric_value,
      unit: d.unit,
      source: d.documents.name,
      period: d.period,
    });
    foundMetrics.add(d.metric_name);
  });
}

// 计算缺失指标
const missing = metric_names.filter(m => !foundMetrics.has(m));
return { success: true, data: { results: allResults, missing } };
```

**方案 B: Promise.all 并行（性能优化）**
```typescript
const yearsToQuery = input.years || [getCurrentYear()];
const promises = yearsToQuery.map(year => queryFinancialData(metric_names, year, period));
const results = await Promise.all(promises);
// 合并结果...
```

**选择方案 A**：代码更简洁，年份数量通常较少（2-5 年），性能差异可忽略。

### 2.4 示例输入输出

**输入**:
```json
{
  "metric_names": ["资产总计", "负债总计"],
  "years": ["2023", "2024"]
}
```

**输出**:
```json
{
  "success": true,
  "data": {
    "results": [
      { "year": "2024", "metric": "资产总计", "value": 1000000, "unit": "元", "source": "2024年度报告", "period": "annual" },
      { "year": "2024", "metric": "负债总计", "value": 600000, "unit": "元", "source": "2024年度报告", "period": "annual" },
      { "year": "2023", "metric": "资产总计", "value": 900000, "unit": "元", "source": "2023年度报告", "period": "annual" },
      { "year": "2023", "metric": "负债总计", "value": 550000, "unit": "元", "source": "2023年度报告", "period": "annual" }
    ],
    "missing": []
  }
}
```

---

## 3. 工具删除设计

### 3.1 get_financial_metric 删除

**影响范围**：
- `src/lib/tools/financial/utility-tools.ts` - 删除工具定义
- `registerUtilityTools()` - 移除注册调用

**迁移路径**：
| 原调用 | 新调用 |
|--------|--------|
| `get_financial_metric({ metric_name: "净利润", years: ["2023", "2024"] })` | `query_financial_data({ metric_names: ["净利润"], years: ["2023", "2024"] })` |

### 3.2 calculate_financial_metric 删除

**影响范围**：
- `src/lib/tools/financial/utility-tools.ts` - 删除工具定义
- `registerUtilityTools()` - 移除注册调用
- `buildGuidanceChatFunctionDefs()` - 移除函数定义

**迁移路径**：
| 原调用 | 新调用 |
|--------|--------|
| `calculate_financial_metric({ metric_name: "current_ratio", inputs: {...} })` | 直接使用 `current_ratio` 预设工具（自动查询 + 计算） |

---

## 4. System Prompt 设计

### 4.1 当前 Prompt 问题

```typescript
// 当前 prompts.ts 第 17-20 行
- Use `query_financial_data` to get specific numbers from the database.
- Use `calculate_financial_metric` for standard ratios (current ratio, debt ratio, etc.).
- Use `get_financial_metric` to get raw metric values for multiple years (for comparisons).
```

问题：
1. 提及已删除的工具
2. 缺乏明确的决策逻辑
3. 没有约束规则

### 4.2 新 Prompt 设计

```typescript
export const UNIFIED_AGENT_SYSTEM_PROMPT = `You are a professional Financial Analysis AI Agent named "Goodman Agent".
Your goal is to assist users with financial data analysis, compliance checking, and information extraction from documents.

### Capabilities:
1. **Financial Analysis**: Query financial metrics (Assets, Liabilities, Profit, etc.) from the database and perform calculations (ratios, margins).
2. **Compliance**: Search for tax regulations, accounting standards, and laws.
3. **Extraction**: Extract structured information from uploaded documents.

### Tool Selection Decision Tree:

根据用户问题类型选择正确的工具：

1. **标准财务比率**（流动比率、资产负债率、ROE、毛利率等）
   → 直接使用对应的预设工具（如 \`current_ratio\`、\`debt_to_asset_ratio\`、\`return_on_equity\`）
   → 这些工具自动查询数据库并完成计算

2. **原始财务指标数值**（资产总计、净利润、营业收入等）
   → 使用 \`query_financial_data\` 查询
   → 支持同时查询多个指标和多个年份

3. **非标准比率或自定义计算**（营销费用占收入比例、自定义公式等）
   → 步骤 1: 使用 \`query_financial_data\` 获取所需数据
   → 步骤 2: 使用 \`evaluate_expression\` 计算结果

4. **文档中的详细信息**（管理层讨论、货币资金明细等）
   → 使用 \`search_documents\` 搜索
   → 如需提取结构化信息，使用 \`extract_document\`

5. **法规合规信息**（税法条款、会计准则等）
   → 使用 \`search_regulations\` 搜索

### Constraint Rules (约束规则):

**禁止以下行为**：
- 如果存在对应的预设工具（22个财务比率），禁止使用 query_financial_data + evaluate_expression 手动计算
  - 错误示例：用户问"流动比率"，你查询流动资产和流动负债后手动计算
  - 正确做法：直接调用 \`current_ratio\` 工具
- 禁止在回答中编造财务数据，必须通过工具获取真实数据
- 禁止使用 evaluate_expression 进行预设工具已覆盖的标准比率计算

**22个预设财务比率工具**：
current_ratio, quick_ratio, cash_ratio, debt_to_asset_ratio, debt_to_equity_ratio,
equity_multiplier, long_term_capital_debt_ratio, interest_coverage_ratio,
gross_profit_margin, net_profit_margin, return_on_assets, return_on_equity,
asset_turnover, inventory_turnover, receivables_turnover, working_capital_turnover,
asset_turnover_days, working_capital, cash_flow_ratio, cash_flow_interest_coverage,
cash_flow_to_debt_ratio, dupont_roe

### Response Guidelines:
- **Language**: Always respond in Chinese (Simplified).
- **Tone**: Professional, objective, and helpful.
- **Citations**: When providing information from documents or regulations, cite the source (Document Name / Regulation Name).
- **Thinking**: Before calling tools, analyze the user's request. If multiple steps are needed, plan them.

### Workflow:
1. Understand the user's intent.
2. Determine tool selection using the Decision Tree above.
3. Call appropriate tools. You can call multiple tools in sequence.
4. Synthesize the tool outputs into a coherent answer.

If you cannot find information, admit it gracefully and suggest alternatives.
`;
```

---

## 5. 文件修改清单

| 文件路径 | 修改类型 | 修改内容 |
|----------|----------|----------|
| `src/lib/tools/types.ts` | 修改 | 更新 QueryFinancialDataInputSchema 和 OutputSchema |
| `src/lib/tools/financial/utility-tools.ts` | 修改 | 删除 2 个工具，增强 query_financial_data |
| `src/lib/workflows/unified/prompts.ts` | 修改 | 替换为新 System Prompt |
| `tests/tools/query-financial-data.test.ts` | 新增 | 单元测试 |

---

## 6. 回滚策略

如果发现问题，可通过以下步骤回滚：

1. 恢复 `utility-tools.ts` 到之前版本（保留 3 个工具）
2. 恢复 `types.ts` 的 Schema 定义
3. 恢复 `prompts.ts` 的原始 System Prompt

所有变更都是代码级别的，不涉及数据库迁移，回滚风险低。

---

## 7. 测试计划

### 7.1 单元测试

| 测试用例 | 输入 | 预期输出 |
|----------|------|----------|
| 单指标单年份 | `{ metric_names: ["资产总计"], years: ["2024"] }` | 返回 1 条记录 |
| 多指标多年份 | `{ metric_names: ["资产总计", "负债总计"], years: ["2023", "2024"] }` | 返回 4 条记录 |
| 无 years 参数 | `{ metric_names: ["资产总计"] }` | 返回所有年份数据 |
| 部分指标缺失 | `{ metric_names: ["资产总计", "不存在的指标"] }` | missing 包含缺失指标 |

### 7.2 集成测试

| 测试场景 | 预期行为 |
|----------|----------|
| 用户问"流动比率" | Agent 调用 `current_ratio` 预设工具 |
| 用户问"2023 和 2024 年净利润对比" | Agent 调用 `query_financial_data` + `evaluate_expression` |
| 用户问"营销费用占收入比例" | Agent 链式调用 query → evaluate |

---

*文档创建日期：2026-01-08*
*状态：等待审批后进入 Phase 3-5*
