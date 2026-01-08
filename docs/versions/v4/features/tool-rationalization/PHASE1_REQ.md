# v4.1 工具体系精简 - Phase 1 需求文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 工具体系精简 (Tool Rationalization) |
| **版本** | v4.1 |
| **依赖** | v4.0 过程透明化 (已完成) |
| **状态** | Phase 1 - 需求定义 |

---

## 问题陈述

当前系统有 **29 个工具**，存在功能重叠和边界不清晰的问题：

| 工具 | 数据源 | 问题 |
|------|--------|------|
| `get_financial_metric` | financial_data 表 | 与 query_financial_data 重叠 |
| `query_financial_data` | financial_data 表 | 接口不同，但数据源相同 |
| `calculate_financial_metric` | 用户提供数据 | 冗余 - 预设工具已自动查询+计算 |

导致的问题：
1. Agent 选择工具时产生混淆
2. 用户体验不一致
3. 维护成本增加

---

## 范围

### 范围内

1. 合并 `get_financial_metric` 到增强版 `query_financial_data`
2. 移除 `calculate_financial_metric`（预设工具已覆盖此功能）
3. 增强 system prompt，添加工具决策树
4. 更新工具描述以提高清晰度
5. 测试（手动 + 自动化）

### 范围外

- 搜索工具改进（`search_regulations` 技术债务已记录）
- 新增财务工具
- UI 变更
- 预设工具修改

---

## 需求详情

### REQ-1: 合并财务查询工具

**当前状态**：
- `get_financial_metric`：单指标，多年份
- `query_financial_data`：多指标，单年份

**目标状态**：
- `query_financial_data`（增强版）：多指标，多年份

**输出结构设计**：

采用**扁平对象列表**格式，便于 LLM 解析（避免嵌套结构导致的 token 逻辑错误）：

```json
{
  "success": true,
  "data": {
    "results": [
      { "year": "2024", "metric": "资产总计", "value": 1000000, "unit": "元", "source": "2024年度报告" },
      { "year": "2024", "metric": "负债总计", "value": 600000, "unit": "元", "source": "2024年度报告" },
      { "year": "2023", "metric": "资产总计", "value": 900000, "unit": "元", "source": "2023年度报告" },
      { "year": "2023", "metric": "负债总计", "value": 550000, "unit": "元", "source": "2023年度报告" }
    ],
    "missing": ["some_metric_not_found"]
  }
}
```

**验收标准**：
- [ ] 增强版 `query_financial_data` 接受指标名称数组
- [ ] 增强版 `query_financial_data` 接受年份数组（可选）
- [ ] 返回结构为标准化 JSON 扁平列表，确保 Agent 易于解析
- [ ] 明确返回缺失指标列表（`missing` 字段）
- [ ] `get_financial_metric` 从注册表移除
- [ ] 向后兼容 - 现有单年份查询仍可正常工作

### REQ-2: 移除 calculate_financial_metric

**理由**：22 个预设工具（如 `current_ratio`、`return_on_equity`）已具备以下功能：
1. 自动从 `financial_data` 表查询所需数据
2. 执行计算
3. 返回格式化结果和解读

`calculate_financial_metric` 需要手动输入数据，这是冗余的。

**非标准比率处理（Composite Calculation）**：

移除 `calculate_financial_metric` 后，非标准比率（不在 22 个预设中）的计算流程为：

```
用户请求："计算营销费用占收入的比例"
│
├─ 1. Agent 调用 query_financial_data(["营销费用", "营业收入"], years=["2024"])
│      返回: [{metric: "营销费用", value: 50000}, {metric: "营业收入", value: 1000000}]
│
└─ 2. Agent 调用 evaluate_expression("50000 / 1000000 * 100")
       返回: 5.0 (即 5%)
```

此工作流完全覆盖原 `calculate_financial_metric` 的功能，且更灵活。

**验收标准**：
- [ ] 工具从注册表移除
- [ ] 无破坏性变更（该工具仅用于边缘情况）
- [ ] System prompt 更新，引导用户使用预设工具
- [ ] 非标准比率可通过 `query_financial_data` → `evaluate_expression` 链式调用完成

### REQ-3: 增强 System Prompt

**当前问题**：System prompt 缺乏明确的工具选择决策树。

**目标状态**：添加显式决策树 + 约束规则：

```
用户问题
│
├─ 标准财务比率？（流动比率、资产负债率、ROE 等）
│   └─► 使用预设工具（自动查询+计算）
│
├─ 原始指标数值？（货币资金、净利润、资产总计等）
│   └─► 使用 query_financial_data
│
├─ 文档中的信息？（管理层讨论、货币资金明细等）
│   └─► 使用 search_documents → extract_document
│
├─ 法规/合规信息？（税法、会计准则等）
│   └─► 使用 search_regulations
│
└─ 数学计算？（增长率、变化、百分比）
    └─► 使用 evaluate_expression
```

**约束规则（防止方法漂移）**：

System prompt 必须明确禁止以下行为，防止 Agent "过度聪明"：

| 禁止行为 | 正确做法 |
|----------|----------|
| 手动计算 ROE（用 evaluate_expression） | 使用 `return_on_equity` 预设工具 |
| 手动计算流动比率 | 使用 `current_ratio` 预设工具 |
| 对预设比率使用 query → evaluate 链 | 直接使用对应预设工具 |

**示例约束语句**：
> "如果用户请求的是 22 个预设比率之一，必须使用对应的预设工具，禁止通过 query_financial_data + evaluate_expression 手动计算。预设工具已包含完整的数据获取、计算和结果解读。"

**验收标准**：
- [ ] 决策树添加到 system prompt
- [ ] 约束规则添加到 system prompt（防止方法漂移）
- [ ] 工具描述更加清晰
- [ ] 示例更新

### REQ-4: 测试策略

**手动测试**：
- 测试各种查询类型，验证正确的工具选择
- 测试增强版 `query_financial_data` 的多年份查询
- 回归测试现有功能

**自动化测试**：
- 增强版 `query_financial_data` 的单元测试
- 工具执行的集成测试
- 确保无破坏性变更

**关键测试用例**：

| 测试类型 | 场景 | 预期行为 |
|----------|------|----------|
| **预设比率** | "计算流动比率" | 调用 `current_ratio` 预设工具 |
| **原始指标** | "查询 2023 和 2024 年的资产总计" | 调用 `query_financial_data` 返回多年份数据 |
| **复合计算** | "计算现金占总负债的比例" | 链式调用：`query_financial_data` → `evaluate_expression` |
| **约束验证** | "用公式计算 ROE" | 必须使用 `return_on_equity`，禁止手动计算 |
| **向后兼容** | 现有单年份查询 | 行为与之前一致 |

**复合计算测试详情**：

验证移除 `calculate_financial_metric` 后，非标准比率仍可正确计算：

```
输入："计算现金占总负债的比例（2024年）"

步骤 1: query_financial_data(["货币资金", "负债合计"], years=["2024"])
        → [{metric: "货币资金", value: 200000}, {metric: "负债合计", value: 1000000}]

步骤 2: evaluate_expression("200000 / 1000000 * 100")
        → 20.0

预期输出：现金占总负债比例为 20%
```

---

## 工具数量汇总

| 类别 | 之前 | 之后 | 变化 |
|------|------|------|------|
| 预设财务工具 | 22 | 22 | - |
| 财务实用工具 | 4 | 2 | -2（合并 + 移除）|
| 搜索工具 | 2 | 2 | - |
| 提取工具 | 1 | 1 | - |
| **总计** | **29** | **27** | **-2** |

**最终工具清单（27 个）**：
- 22 个预设工具（current_ratio、ROE 等）
- `query_financial_data`（增强版：多指标 + 多年份）
- `evaluate_expression`（数学计算）
- `search_documents`（公司文档搜索）
- `search_regulations`（法规文档搜索）
- `extract_document`（结构化提取）

---

## 需修改的文件

| 文件 | 变更 |
|------|------|
| `src/lib/tools/financial/utility-tools.ts` | 移除 2 个工具，增强 1 个 |
| `src/lib/tools/index.ts` | 更新导出 |
| `src/lib/workflows/unified/prompts.ts` | 添加决策树 |
| `tests/` | 添加单元/集成测试 |

---

## 风险与缓解措施

| 风险 | 缓解措施 |
|------|----------|
| 破坏现有查询 | 确保增强版工具向后兼容 |
| Agent 工具选择退化 | 全面的手动测试 |
| 遗漏边缘情况 | 记录限制，部署后监控 |
| 输出结构变更导致 Agent 解析失败 | 采用标准化扁平列表格式，便于 LLM 解析 |
| 非标准比率无法计算 | 复合计算测试用例验证 query → evaluate 链式调用 |

---

## 成功标准

1. 工具数量从 29 减少到 27
2. 现有功能无破坏性变更
3. Agent 根据查询类型正确选择工具
4. 所有测试通过
5. System prompt 提供清晰的工具指导

---

*文档创建日期：2026-01-08*
*状态：等待审批后进入 Phase 2*
