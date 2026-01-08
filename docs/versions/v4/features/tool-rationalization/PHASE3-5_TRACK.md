# v4.1 工具体系精简 - Phase 3-5 实施跟踪

## 概述

本文档跟踪 v4.1 工具体系精简的实施进度。

---

## 实施顺序

> **重要**: 按以下顺序执行，利用 TypeScript 错误引导修复。

1. **Task 1**: 修改 types.ts → 产生 TypeScript 错误
2. **Task 2**: 修复 utility-tools.ts（增强 query_financial_data）→ 错误消失
3. **Task 3-4**: 删除旧工具（仅在 Task 2 编译通过后）
4. **Task 5**: 更新 System Prompt
5. **Task 6-8**: 测试验证

---

## 实施任务清单

### Task 1: 更新 types.ts Schema 定义

**状态**: 待开始

**文件**: `src/lib/tools/types.ts`

**变更内容**:
- [ ] 修改 `QueryFinancialDataInputSchema`：`year` → `years` (数组)
- [ ] 修改 `QueryFinancialDataOutputSchema`：Record → 扁平列表格式
- [ ] 更新类型导出

**代码变更**:
```typescript
// Before
export const QueryFinancialDataInputSchema = z.object({
  metric_names: z.array(z.string()),
  year: z.string().optional(),
  period: z.string().optional(),
});

// After
export const QueryFinancialDataInputSchema = z.object({
  metric_names: z.array(z.string()),
  years: z.array(z.string()).optional(),
  period: z.string().optional(),
});
```

> **注意**: 此步骤会导致 utility-tools.ts 产生 TypeScript 错误，这是预期行为。

---

### Task 2: 增强 query_financial_data 工具

**状态**: 待开始

**文件**: `src/lib/tools/financial/utility-tools.ts`

**变更内容**:
- [ ] 更新输入处理：支持 `years` 数组
- [ ] 更新输出格式：扁平列表 + missing 字段
- [ ] 更新工具描述

**实施细节**:

```typescript
// 输入解构更新
const { metric_names, years, period } = input as {
  metric_names: string[];
  years?: string[];
  period?: string;
};

// 多年份处理（循环调用）
const yearsToQuery = years || [new Date().getFullYear().toString()];
const allResults: Array<{...}> = [];
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

// 缺失指标
const missing = metric_names.filter(m => !foundMetrics.has(m));

return { success: true, data: { results: allResults, missing } };
```

> **验证**: 运行 `npm run build` 确认 TypeScript 错误已解决。

---

### Task 3: 删除 get_financial_metric 工具

**状态**: 待开始

**文件**: `src/lib/tools/financial/utility-tools.ts`

**前置条件**: Task 2 编译通过

**变更内容**:
- [ ] 删除 `getFinancialMetricTool` 定义（约 70 行代码）
- [ ] 从 `registerUtilityTools()` 移除注册

---

### Task 4: 删除 calculate_financial_metric 工具

**状态**: 待开始

**文件**: `src/lib/tools/financial/utility-tools.ts`

**前置条件**: Task 2 编译通过

**变更内容**:
- [ ] 删除 `calculateFinancialMetricTool` 定义（约 50 行代码）
- [ ] 从 `registerUtilityTools()` 移除注册
- [ ] 从 `buildGuidanceChatFunctionDefs()` 移除函数定义

---

### Task 5: 更新 System Prompt

**状态**: 待开始

**文件**: `src/lib/workflows/unified/prompts.ts`

**变更内容**:
- [ ] 添加工具选择决策树
- [ ] 添加约束规则（防止方法漂移）
- [ ] 移除对已删除工具的引用
- [ ] 列出 22 个预设工具名称

---

### Task 6: 添加单元测试

**状态**: 待开始

**文件**: `tests/tools/query-financial-data.test.ts` (新建)

**测试用例**:
- [ ] 单指标单年份查询
- [ ] 多指标多年份查询
- [ ] 无 years 参数（返回所有年份）
- [ ] 部分指标缺失场景
- [ ] 空结果处理

---

### Task 7: 手动测试验证

**状态**: 待开始

**测试场景**:
- [ ] 预设比率查询：用户问"流动比率"
- [ ] 原始指标查询：用户问"2023 和 2024 年净利润"
- [ ] 复合计算：用户问"现金占总负债比例"
- [ ] 约束验证：确认 Agent 不会手动计算预设比率
- [ ] 向后兼容：现有功能正常工作

---

### Task 8: TypeScript 编译验证

**状态**: 待开始

**验证内容**:
- [ ] `npm run build` 无类型错误
- [ ] 无未使用的导入/变量警告

---

## 进度汇总

| Task | 描述 | 状态 |
|------|------|------|
| 1 | 更新 types.ts Schema | 待开始 |
| 2 | 增强 query_financial_data | 待开始 |
| 3 | 删除 get_financial_metric | 待开始 |
| 4 | 删除 calculate_financial_metric | 待开始 |
| 5 | 更新 System Prompt | 待开始 |
| 6 | 添加单元测试 | 待开始 |
| 7 | 手动测试验证 | 待开始 |
| 8 | TypeScript 编译验证 | 待开始 |

---

## 实施记录

### [日期待填写] Task X 实施

*实施记录将在执行时填写*

---

*文档创建日期：2026-01-08*
*状态：等待审批后开始实施*
