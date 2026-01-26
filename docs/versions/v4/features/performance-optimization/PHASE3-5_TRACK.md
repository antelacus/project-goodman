# v4.6 性能优化 - Phase 3-5 实现跟踪

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 性能优化 (Performance Optimization) |
| **版本** | v4.6 |
| **状态** | Phase 3-5 - 进行中 |
| **设计文档** | [PHASE2_DESIGN.md](./PHASE2_DESIGN.md) |

---

## 实现任务

### A. 可靠性矩阵与验收标准

#### A1: 输出 P0/P1 关键流程清单

- [x] 定义 P0 流程清单（含入口 API 与成功判定）
- [x] 定义 P1 流程清单（低频/次要流程）
- [x] 每条流程至少 1 条可执行验收步骤
- [x] 文档化到 `docs/reports/2026-1-20-performance-optimization-workflow_reliability_matrix.md`

#### A2: 指标口径与采样规则

- [x] 明确采样周期与样本量标准（≥7 天或 ≥200 请求）
- [x] 定义成功率/错误率/P95 的计算口径
- [x] 记录与 v4.4 observability 对接方式

#### A3: 指标映射表

- [x] 每条 P0 流程映射到日志字段与指标名称
- [x] 标明阈值（成功率/5xx/P95）
- [x] 标明失败归因字段（errorType/step）

---

### B. 错误分类与结构化日志统一

#### B1: 统一错误分类

- [x] 定义错误分类枚举（VALIDATION/AUTH/TIMEOUT/RETRIEVAL_EMPTY/EXTRACTION_FAILED/REPORT_FAILED/INTERNAL）
- [x] 明确每类错误的用户提示策略

#### B2: 结构化日志契约

- [x] 定义 workflow event 日志字段（workflow/step/status/duration/errorType/requestId）
- [x] 明确写入时机（start/success/failure）

#### B3: P0 路由日志补齐

- [x] Chat：记录首 token 与完成事件耗时
- [x] 报告生成：记录开始/完成/失败事件
- [x] 文档提取：记录上传→提取→保存关键节点
- [x] Quick Actions：记录执行成功/失败
- [x] Admin 上传/配置：记录关键节点与失败原因

---

### C. P0 流程稳定性优化

#### C1: Agent 工作流（Chat）

- [x] 检索失败/空结果降级提示
- [x] 错误信息标准化并记录 errorType
- [x] 关键节点不中断（可重试或明确失败引导）

#### C2: 检索可靠性与一致性

- [x] 统一检索入口行为（文档检索 + structured 查询）
- [x] 对空结果输出明确解释与下一步建议
- [x] 对示例数据确保可复现

#### C3: 文档提取稳定性

- [x] 确保标准错误结构返回
- [x] 异常场景记录 errorType + requestId
- [x] 确保 P95 目标可测量

#### C4: 报告生成稳定性

- [x] SSE 完成/失败事件完整性
- [x] 失败原因可归因并记录
- [x] 保证 P95 目标可测量

#### C5: Quick Actions 与管理员流程

- [x] Quick Actions 输出与描述一致
- [x] 管理员上传/配置流程稳定且可追踪

---

### D. 回归测试补齐

#### D1: 集成测试（关键 API）

- [x] Chat stream 成功路径测试
- [x] Chat stream 失败路径测试（错误分类）
- [x] 报告生成成功路径测试
- [x] 报告生成失败路径测试
- [x] 文档提取成功路径测试
- [x] 文档提取失败路径测试
- [x] Quick Actions 成功/失败路径测试
- [x] 管理员关键流程测试（上传/配置）

#### D2: 最小 E2E 冒烟

- [x] 报告生成端到端流程
- [x] 文档提取端到端流程

#### D3: 覆盖率与回归记录

- [x] 生成覆盖率报告并记录数值
- [x] 更新本文件中的测试执行记录

---

### E. 功能描述一致性与 UI 文案

#### E1: Landing

- [x] 去除装饰性动效（移除 hero 区域黄色光晕、脉冲动画、阴影）
- [x] "为什么选择 Goodman？" 区块改为白色背景（与其他区块一致）
- [x] 中英文风格保持现状（用户确认无需修改）

#### E2: Login

- [x] 替换为"仅限管理员使用，暂不开放注册"

#### E3: Chat

- [x] GuestBanner 始终显示具体限额数值（20 消息/5 上传/10 提取）
- [x] 移除 `hidden sm:` 使小屏幕也能看到限额
- [x] 无配额数据时显示默认值作为 fallback

#### E4: About

- [x] 全文案重写：移除"重新定义财务工作流"等过强表述
- [x] 移除 GPT-4o、LangGraph、Chain of Thought 等内部技术细节
- [x] 移除硬编码版本号
- [x] "合规保障" → "合规参考"，移除"实时引用"承诺

#### E5: Help

- [x] 全文案重写：移除"几秒钟内"等时间承诺
- [x] 新增"访问权限说明"区块，明确访客/管理员权限差异
- [x] 功能描述与实际能力一致
- [x] "联系技术支持" → "通过侧栏联系我发送邮件"

---

### F. 性能回归监控与告警

#### F1: 指标关联

- [x] 确保日志字段可映射成功率/错误率/P95（已在 `docs/OBSERVABILITY.md` 补充映射说明）
- [x] 明确日志与监控平台的关联方式（Sentry/UptimeRobot 告警对齐说明）

#### F2: 阈值记录

- [x] 在文档中记录各流程阈值与目标（对齐 v4.6 目标）
- [x] 确认触发告警的日志/规则（Sentry P95/失败率 + UptimeRobot 健康检查）

---

### G. 报告输出格式调整（DOCX）

#### G1: 数据模型与类型

- [x] 新增 `docx_storage_path` 字段（Supabase migration）
- [x] 更新 TypeScript 类型字段（`docxStoragePath`）
- [x] 保留 `pdf_storage_path` 仅兼容历史数据

#### G2: DOCX 生成与存储

- [x] 实现 DOCX 生成与上传流程（替换 PDF 生成/上传）
- [x] 统一文件命名与 Content-Type（`.docx`）
- [x] 更新报告记录保存 `docx_storage_path`

#### G3: API 与前端保存流程

- [x] `/api/reports/save` 返回 DOCX 下载地址
- [x] 新增 `/api/reports/[id]/docx` 下载接口（替代 `/pdf`）
- [x] `useReportGeneration` 保存逻辑与提示文案改为 DOCX

#### G4: UI 文案与下载入口

- [x] `ReportActions` 与 `ReportsList` 下载按钮替换为 DOCX
- [x] 移除 UI/文案中 PDF 输出描述
- [x] 无 DOCX 时显示清晰提示与引导

#### G5: 验收测试

- [x] 新生成报告保存并下载 DOCX 成功
- [x] 无 DOCX 时提示明确（不回退到 PDF）

---

### H. 报告生成上下文增强（REQ-F2）

#### H1: 状态 Schema 变更

- [x] 在 `state.ts` 新增 `companyProfile` 字段
- [x] 在 `state.ts` 新增 `financialPolicy` 字段
- [x] 保持 `companyInfo` 字段向后兼容

#### H2: 上下文文档检索

- [x] 实现 `fetchDocumentContent()` 函数（从 document_chunks 拼接内容）
- [x] 在 `gather-context.ts` 检索 `公司详细档案.md`（doc_type='business_info'）
- [x] 在 `gather-context.ts` 检索 `财务管理制度.md`（doc_type='policy'）
- [x] 两份文档并行查询以优化性能
- [x] 实现内容截断策略（~12000 字符上限）

#### H3: 降级策略实现

- [x] 文档不存在时记录 warning 并继续
- [x] 文档内容为空时记录 warning 并继续
- [x] 设置 5s 查询超时，超时则跳过
- [x] 确保任何检索失败不阻断报告生成流程

#### H4: Prompt 注入

- [x] 修改 `buildSectionAnalysisPrompt()` 接受 `companyContext` 参数
- [x] 实现上下文注入模板（公司档案摘要 + 财务管理基准）
- [x] 添加分析要求指导（使用公司基准而非通用基准）
- [x] 在 `analyze-sections.ts` 传递上下文到 prompt 构建

#### H5: 验收测试

- [x] 验证 `gather-context` 能成功检索两份文档内容（单元测试）
- [x] 验证文档缺失时优雅降级（不阻断流程，单元测试）
- [x] 验证 LLM prompt 包含公司上下文（单元测试；日志确认待 staging）
- [x] 验证生成的报告分析体现公司特性（见现有 DOCX 输出中的 IDM/Fabless/AI 表述）
- [ ] 验证报告生成 P95 < 60s（需 staging 日志/指标）

---

### J. 报告输出正确性修复

#### J1: 报告指标格式化（百分比/千分位）

- [x] 报告指标统一输出百分比（两位小数）
- [x] 货币指标使用千分位 + 万元单位
- [x] 与上期对比值格式一致

#### J2: DOCX 上期格式化一致性

- [x] DOCX 表格上期数值使用统一格式化逻辑
- [x] 上期单位与本期一致

#### J3: 指标解释文案去数值阈值 + 比率统一百分比

- [x] 删除指标解释中的固定数值阈值
- [x] 比率类指标统一输出百分比

#### J4: 报告分析提示词去硬阈值 + 2024 原因指引

- [ ] 删除提示词中的硬编码阈值
- [ ] 明确原因解释需基于 2024 年发生事项与公司上下文

---

### I. Agent 工具测试与问题修复（计划外）

> 通过 70 题 Agent 测试脚本 (`tests/agent-tool-test.ts`) 进行多轮测试，发现并修复问题。

#### 第一轮测试 (2026-01-23)

**测试发现**: 见 `docs/manual-test-log/agent-test-2026-01-23.md`

主要问题：
1. 财务指标名称不一致导致取数失败（Q17/Q18/Q21/Q43/Q49/Q62/Q70）
2. 过程日志中的公式展示误导（Q31/Q39/Q51/Q52）
3. 文档/法规搜索输入校验失败（Q55–Q60）
4. 利息保障倍数类指标与财务费用负值处理不明确（Q40/Q41）
5. "现金流状况"类问题的响应不符合期望（Q63）
6. 文档搜索问题被动追问而非直接检索（Q57）

**实施计划**: 见 `docs/plans/2026-01-25-v4-6-manual-test-fixes.md`

主要修复：
- [x] Task 1: 集中管理模型/Prompt/参数 → `src/lib/ai/config.ts`
- [x] Task 2: 新财务科目注册表 + 别名归一化 → `src/lib/financial/metric-registry.ts`
- [x] Task 3-4: 统一 AI 抽取 schema 与校验规则
- [x] Task 5: 预设函数更新（禁用阈值提示）
- [x] Task 6: 查询工具别名归一化 + 原始指标名回显
- [x] Task 7: 搜索工具输入容错（year/limit coercion）
- [x] Task 8: 过程日志公式展示修复
- [x] Task 9: 统一提示词约束（现金流状况 + 文档搜索默认先检索）
- [x] Task 10: 严格校验失败拒绝入库
- [x] Task 11: 数据清理（Supabase）

#### 第二轮测试 (2026-01-26)

**实施计划**: 见 `docs/plans/2026-01-26-financial-validation-rules.md`

为财务校验新增并强化 16 条规则（含利润表净利润以下与现金流投资/筹资小计），全部作为阻断性错误：

- [x] Task 1: 资产总计=负债和所有者权益总计
- [x] Task 2: 营业总收入/营业总成本由 warning 改为 error
- [x] Task 3: 净利润拆分校验（持续经营+终止经营）
- [x] Task 4: 净利润归属校验（母公司+少数股东）
- [x] Task 5: 其他综合收益拆分校验
- [x] Task 6: 母公司其他综合收益拆分校验
- [x] Task 7: 不可重分类其他综合收益子项加总校验
- [x] Task 8: 可重分类其他综合收益子项加总校验
- [x] Task 9: 综合收益总额公式校验
- [x] Task 10: 综合收益归属校验
- [x] Task 11: 母公司综合收益公式校验
- [x] Task 12: 少数股东综合收益公式校验
- [x] Task 13-14: 投资活动现金流入/流出小计
- [x] Task 15-16: 筹资活动现金流入/流出小计

#### 第三轮测试 (2026-01-26)

**测试发现**: 见 `docs/manual-test-log/agent-test-2026-01-26.md`

#### I1: 营业成本查询失败 (Q18)

- [x] 问题：LLM 传递部分 key `营业总成本-营业成本` 未被识别
- [x] 修复：在 `metric-registry.ts` 的 `IS.OPERATING_COSTS` 添加别名 `'营业总成本-营业成本'`
- [x] 验证：Q18 测试通过

#### I2: 文档搜索失败 (Q55-57)

- [x] 问题：`search_documents_hybrid` 函数报错 `operator does not exist: extensions.vector <=> extensions.vector`
- [x] 根因：函数 `search_path` 未包含 `extensions` schema（pgvector 操作符所在位置）
- [x] 修复：创建迁移 `20260126000000_fix_search_documents_hybrid_search_path.sql`，添加 `SET search_path TO 'public', 'extensions'`
- [x] 验证：Q55-57 测试通过

#### I3: 法规搜索优先级问题 (Q59)

- [x] 问题：Agent 未优先搜索公司相关文档，直接搜索通用法规
- [x] 修复：在 `config.ts` 系统提示词中添加搜索优先级指导
- [x] 验证：Q59 测试通过

#### I4: Agent 要求澄清公司名称 (Q66-67)

- [x] 问题：Agent 询问"请问您需要查询的是哪家公司？"
- [x] 修复：在 `config.ts` 系统提示词中添加 Context 区块，明确服务于单一公司，并添加约束"禁止询问公司名称"
- [x] 验证：Q66-67 测试通过

#### I5: 毛利率查询未要求年份澄清 (Q70)

- [x] 问题：Agent 直接返回 2024 年数据，未询问用户想查询哪一年
- [x] 修复：在 `config.ts` 系统提示词中添加年份澄清要求
- [x] 验证：Q70 测试通过

---

## Phase 5: 综合测试清单

- [ ] ESLint 通过（`npm run lint`）
- [ ] TypeScript 编译通过（`npm run build`）
- [ ] 单元测试通过（`npm run test -- --run`）
- [ ] 集成测试全部通过
- [ ] 最小 E2E 冒烟测试通过
- [ ] 覆盖率报告生成并记录
- [ ] 更新本文件测试结果与日期

**测试记录**:

```
状态: ✅ 覆盖率达标
时间: 2026-01-21 03:50
环境: 本地 sandbox
结果:
- npm run test:coverage ✅ (Lines 57.34%, Statements 56.07%, Branches 44.5%, Functions 66.33%)
备注:
- 补充单元测试覆盖：errors/base、tools/registry、database/helpers、documents/file-utils、database/supabase、tools/types
```

```
状态: ✅ 手动测试问题修复完成（第二轮）
时间: 2026-01-23
环境: 本地 sandbox
范围:
- 修复访客限额在报告生成被拒绝时不刷新（前端事件触发）
- 修复 DOCX 保存失败（storage MIME allowlist + 回退上传策略）
- Help 页面卡片标题与图标对齐到同一行
- Documents 页面标题移除管理员登录入口触发
测试:
- npm run test -- --run tests/unit/hooks/useReportGeneration.test.tsx ✅
- npm run test -- --run tests/unit/reports/docx-upload.test.ts ✅
- npm run test -- --run tests/unit/help/help-card-layout.test.ts ✅
- npm run test -- --run tests/unit/documents/documents-title-login.test.ts ✅
- npm run test -- --run tests/unit/storage/storage-mime-types.test.ts ✅
```

```
状态: ✅ Agent 手动测试问题修复完成（第三轮）
时间: 2026-01-26
环境: 本地 sandbox + Supabase 生产数据库
范围:
- Q18: 营业成本查询失败 → 添加 metric alias
- Q55-57: 文档搜索失败 → 修复 search_documents_hybrid search_path
- Q59: 法规搜索优先级 → 更新系统提示词
- Q66-67: Agent 询问公司名称 → 更新系统提示词
- Q70: 毛利率未询问年份 → 更新系统提示词
测试:
- tests/agent-tool-test.ts Q18 ✅
- tests/agent-tool-test.ts Q55-57 ✅
- tests/agent-tool-test.ts Q59 ✅
- tests/agent-tool-test.ts Q66-67 ✅
- tests/agent-tool-test.ts Q70 ✅
```

```
状态: ⚠️ H5 局部验收完成
时间: 2026-01-26 11:30
环境: 本地 sandbox
结果:
- npm run test -- --run tests/unit/workflows/report/gather-context.test.ts ✅
- npm run test -- --run tests/unit/workflows/report/prompts.test.ts ✅
证据:
- data/report_2024_vs_2023_1769424789896.docx 包含 IDM/Fabless/AI 超级周期等公司特性表述
待完成:
- 报告生成 P95 < 60s（需 staging 7 天/200 请求采样）
```
