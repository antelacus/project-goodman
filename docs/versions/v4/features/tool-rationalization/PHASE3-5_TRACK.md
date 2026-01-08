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

**状态**: ✅ 已完成

**文件**: `src/lib/tools/types.ts`

**变更内容**:
- [x] 修改 `QueryFinancialDataInputSchema`：`year` → `years` (数组)
- [x] 修改 `QueryFinancialDataOutputSchema`：Record → 扁平列表格式
- [x] 更新类型导出

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

---

### Task 2: 增强 query_financial_data 工具

**状态**: ✅ 已完成

**文件**: `src/lib/tools/financial/utility-tools.ts`

**变更内容**:
- [x] 更新输入处理：支持 `years` 数组
- [x] 更新输出格式：扁平列表 + missing 字段
- [x] 更新工具描述（改为中文）

**实施细节**: 按设计文档实现，使用循环调用策略处理多年份查询。

---

### Task 3: 删除 get_financial_metric 工具

**状态**: ✅ 已完成

**文件**: `src/lib/tools/financial/utility-tools.ts`

**变更内容**:
- [x] 删除 `getFinancialMetricTool` 定义（约 70 行代码）
- [x] 从 `registerUtilityTools()` 移除注册
- [x] 从 `src/lib/tools/financial/index.ts` 移除导出

---

### Task 4: 删除 calculate_financial_metric 工具

**状态**: ✅ 已完成

**文件**: `src/lib/tools/financial/utility-tools.ts`

**变更内容**:
- [x] 删除 `calculateFinancialMetricTool` 定义（约 50 行代码）
- [x] 从 `registerUtilityTools()` 移除注册
- [x] 从 `buildGuidanceChatFunctionDefs()` 移除函数定义
- [x] 从 `src/lib/tools/financial/index.ts` 移除导出
- [x] 移除未使用的 `presetFunctions` 和 `executeFunction` 导入

---

### Task 5: 更新 System Prompt

**状态**: ✅ 已完成

**文件**: `src/lib/workflows/unified/prompts.ts`

**变更内容**:
- [x] 添加工具选择决策树
- [x] 添加约束规则（防止方法漂移）
- [x] 移除对已删除工具的引用
- [x] 列出 22 个预设工具名称

---

### Task 6: 添加单元测试

**状态**: ✅ 已完成

**文件**: `tests/unit/query-financial-data.test.ts` (新建)

**测试用例**:
- [x] 单指标单年份查询 (Schema 验证)
- [x] 多指标多年份查询 (Schema 验证)
- [x] 无 years 参数（默认当前年份）
- [x] 部分指标缺失场景
- [x] 输出格式验证（扁平列表结构）

---

### Task 7: 手动测试验证

**状态**: ✅ 已完成

**测试场景**:
- [x] 预设比率查询：用户问"流动比率"
- [x] 原始指标查询：用户问"2023 和 2024 年净利润"
- [x] 复合计算：用户问"现金占总负债比例"
- [x] 约束验证：确认 Agent 不会手动计算预设比率
- [x] 向后兼容：现有功能正常工作

> **验证完成**: 2026-01-08 部署后通过 UI 验证通过。

---

### Task 8: TypeScript 编译验证

**状态**: ✅ 已完成

**验证内容**:
- [x] `npm run build` 无类型错误
- [x] 无未使用的导入/变量警告

---

## 进度汇总

| Task | 描述 | 状态 |
|------|------|------|
| 1 | 更新 types.ts Schema | ✅ 已完成 |
| 2 | 增强 query_financial_data | ✅ 已完成 |
| 3 | 删除 get_financial_metric | ✅ 已完成 |
| 4 | 删除 calculate_financial_metric | ✅ 已完成 |
| 5 | 更新 System Prompt | ✅ 已完成 |
| 6 | 添加单元测试 | ✅ 已完成 |
| 7 | 手动测试验证 | ✅ 已完成 |
| 8 | TypeScript 编译验证 | ✅ 已完成 |

---

## 实施记录

### 2026-01-08 Phase 3-5 实施

**实施内容**:

1. **Task 1-2**: 更新 Schema 并增强 query_financial_data
   - 输入参数从 `year` 改为 `years` 数组
   - 输出格式从 Record 改为扁平列表 `{ results: [], missing: [] }`
   - 默认查询当前年份

2. **Task 3-4**: 删除冗余工具
   - 删除 `get_financial_metric` (功能合并到 query_financial_data)
   - 删除 `calculate_financial_metric` (预设工具已覆盖)
   - 工具数量从 29 减少到 27

3. **Task 5**: 更新 System Prompt
   - 添加决策树指导工具选择
   - 添加约束规则防止 Agent 绕过预设工具
   - 列出 22 个预设财务比率工具名称

4. **Task 6,8**: 测试验证
   - 创建单元测试 `tests/unit/query-financial-data.test.ts`
   - TypeScript 编译通过
   - `npm run build` 成功

**修改文件清单**:
- `src/lib/tools/types.ts` - Schema 更新
- `src/lib/tools/financial/utility-tools.ts` - 工具实现
- `src/lib/tools/financial/index.ts` - 导出更新
- `src/lib/workflows/unified/prompts.ts` - System Prompt
- `tests/unit/query-financial-data.test.ts` - 新增测试

---

*文档创建日期：2026-01-08*
*实施完成日期：2026-01-08*
*发布日期：2026-01-08*
*状态：✅ 已发布 v4.1.0*
