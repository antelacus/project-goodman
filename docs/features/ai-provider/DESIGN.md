# DESIGN — ai-provider

## 1 引言

### 1.1 参考

- 需求：`docs/features/ai-provider/REQ.md`（下文 §-id 均指 REQ）
- 技术债：`docs/TECHNICAL_DEBT.md` TD-030、TD-031

### 1.2 术语

N/A —— 不引入新的业务术语。

## 2 总体设计

### 2.1 模块关系

| 模块 / 文件 | 单一职责 | 测试层级 |
|-------------|---------|---------|
| `src/lib/ai/`（AI 入口） | 本项目唯一调用 AI SDK 的地方。对外只有 4 个函数：`generateText`、`generateJSON`、`chatWithTools`、`readDocumentText`。内部决定模型、参数、系统提示词的放法，并把一切失败统一成 `AIUnavailableError` | core |
| `src/lib/search/`（检索） | 对外 2 个函数：`searchRegulations(keywords)` 返回带出处的条款，`searchKnowledge(keywords, filters)` 返回资料库切块。内部拼 PGroonga 查询、调数据库函数 | IO |
| `src/lib/tools/search/*` | agent 工具：把 agent 给的关键词交给 `src/lib/search/`，把结果整理成模型可读、过程日志可链接的形状。不含检索逻辑 | IO |
| `src/lib/workflows/core/nodes/tool-executor.ts` | 执行工具调用；新增检索次数上限（§search-rounds） | core |
| `src/lib/extraction/regulation-splitter.ts`（新） | 法规原文 → 条款列表 + 异常清单。纯函数，不碰数据库、不碰 AI | core |
| `scripts/resplit-regulations.ts`（新） | 一次性：从 Storage 取 45 份原文件 → 抽文字 → 拆分 → 核对 → 备份 → 替换 | IO |
| `src/lib/workflows/report/nodes/*` | 报告章节分析与摘要；失败时标记状态，不写兜底文字 | core |
| 报告渲染（`ReportSummary.tsx`、PDF、Word 生成器） | 按章节与摘要的状态显示失败文案 | IO |
| `scripts/smoke-test-staging.js` | 报告有失败章节或摘要未生成即判不通过（§smoke-report） | infra |

依赖方向：路由、工作流、工具 → `src/lib/search/`、`src/lib/ai/`；`src/lib/search/` 不依赖 `src/lib/ai/`（检索不调 AI）。守护：一条测试扫描 `src/`，`openai` 包只允许在 `src/lib/ai/` 内被导入。

不用"每个调用点各自修好"，因为 §system-prompt、§relay-params 这类规则散在 15 个调用点上就有 15 个漏处；集中后规则只写一遍，系统提示词是必填参数，漏传编译不过。

### 2.2 数据流

**对话（法规问题）**：用户问题 → `chatWithTools`（系统提示词含检索预算与资料库外作答规则）→ 模型给出关键词调用 `search_regulations` → `searchRegulations` 以 PGroonga OR 查询、TF-IDF 排序取前 5 条 → 工具结果带法规名、条款号、原文档标识 → 过程日志事件带原文链接 → 模型作答，正文引用《法规名》第 X 条。最多 3 次检索（§5.3）。

**报告**：指标由程序计算（不经 AI，金额与比率的计算点不变）→ 每章 `generateText` 写分析 → 某章失败则该章 `analysisStatus: 'failed'`、指标照留 → 任一章失败或摘要调用失败则摘要 `status: 'not_generated'` → 渲染时显示 REQ §5.2 的文案。

**上传**：文件 → 文字（文本型 PDF 直接抽；扫描件、图片经 `readDocumentText`）→ 切块写入 `document_chunks`（不再生成向量）→ 财务报表经 `generateJSON` 提取 → 写 `financial_data`。提取失败时整个上传失败，不写财务数据。

**重新拆分（一次性）**：Storage 原文件 → `unpdf` 抽文字 → `regulation-splitter` → 异常清单交 Jason → 备份现表 → 按文档替换 `structured_regulations`。

## 3 入口

| 角色 | 入口 | 本版变化 |
|------|------|---------|
| 财务人员 | `/api/chat/stream` | 检索改为 PGroonga；出处与链接；AI 失败文案 |
| 财务人员 | `/api/reports/generate`、`/api/reports/parse-config` | 失败状态；模型改为统一入口 |
| 财务人员 | `/api/documents/upload-temp`、`/api/quick-actions/extract` | 不再生成向量；文字识别与提取走统一入口 |
| 管理员 | `/api/admin/upload-database-document` | 不再生成向量；法规改用新拆分器 |
| Claude（一次性） | `scripts/resplit-regulations.ts` | 新增 |
| 部署 | `scripts/smoke-test-staging.js` | 检查报告失败状态 |

## 4 模块间契约

**AI 入口**（`src/lib/ai/`）：

- 4 个函数都要求非空的 `system`；`readDocumentText` 的系统提示词固定在入口内部（Responses API 放进 `instructions`）。
- 模型是代码中的常量 `gpt-6.1-sol`，不再从环境变量 `LLM_MODEL_*` / `OPENAI_*` 读取；输出上限按用途配置，用 `max_completion_tokens`（新模型的推理 token 也计入其中，上限按此留足）；不传 `temperature`。
- 凭据只读 `LLM_API_KEY`、`LLM_BASE_URL`，去掉对 `OPENAI_API_KEY` / `OPENAI_BASE_URL` 的回退。
- 失败一律抛 `AIUnavailableError`：SDK 重试用尽、超时、返回空内容、JSON 无法解析或不符合 schema。调用方只处理这一种 AI 错误。

**检索**（`src/lib/search/`）：

- 入参是关键词数组（agent 负责把口语改写成术语），不是整句。多个关键词按 OR 组合，用 `pgroonga_query_escape` 转义每个词。
- `searchRegulations` 每条返回：`regulationName`、`articleNumber`、`content`、`documentId`、`fileUrl`、`score`。`searchKnowledge` 每条返回切块与所属文档。
- 空结果返回空数组，数据库出错抛错（工具层转成"检索暂时失败"）。

**检索预算**：agent 状态新增 `searchCallsUsed`。`tool-executor` 遇到第 4 次及以后的检索调用，不执行检索，直接返回 `empty: true`、原因"本问题的检索次数已用完（最多 3 次），请基于已有结果作答"。两个检索工具合计计数。

**过程日志**：`ProcessEvent.sourceReference`（单个）改为 `sourceReferences`（数组），`SourceReference` 增加可选的 `article`。过程事件只在前端内存中，不入库，所以没有旧数据要兼容。

**出处名称**：显示用《…》形式，由 `regulation_name` 推导：`企业会计准则第22号-金融工具的确认和计量-2018` → `《企业会计准则第22号——金融工具的确认和计量》`（去掉末尾版本年份）。推导是纯函数，测试覆盖 45 个现有名称。

**报告内容**（存入 `reports` 的 JSON）：

- `ReportSection` 增加 `analysisStatus: 'ok' | 'failed'`；失败时 `analysis` 为 REQ §5.2 的文案，`metrics` 照常。
- `ReportSummary` 增加 `status: 'ok' | 'not_generated'` 与 `reason`；未生成时三个列表为空。
- 已存的旧报告没有这两个字段，渲染时按 `'ok'` 处理。

## 5 持久化数据

| 表 | 粒度 | 本版变化 |
|----|------|---------|
| `structured_regulations` | 一行 = 一部法规的一条条款 | 数据整体替换（§5.6）；新增生成列 `search_text`（去掉换行的正文）及其 PGroonga 索引 |
| `structured_regulations_backup` | 替换前的整表副本 | 新增；Phase 6 与向量列一同删除 |
| `document_chunks` | 一行 = 一个文档切块 | 新增生成列 `search_text` 及 PGroonga 索引；`embedding` 列 Phase 6 删除 |
| `documents` | 一行 = 一份文档 | 不变 |

新增数据库函数：`search_regulation_articles(p_query, p_limit)`、`search_knowledge_chunks(p_query, p_limit, p_year, p_doc_type)`，均用 `scorer_tf_idf` 排序。Phase 6 删除：`match_documents`、`search_documents_hybrid`、`search_regulations_hybrid`、`embedding` 列、`vector` 扩展（若无他用）。

迁移规则：本版迁移只增不删，直到 Phase 6（REQ §6.1）。每个迁移经 Supabase MCP 执行后，以数据库登记的编号同时提交到 `supabase/migrations/`（TD-031）。逐列定义见 `src/lib/database/types.ts`，迁移后重新生成。

## 6 异常流

| 触发 | 去向 | 理由 |
|------|------|------|
| AI 调用失败（任何用途） | 抛 `AIUnavailableError`，由调用方转成 REQ §5.2 的文案；fail-closed | 宁可显示失败，不显示编造内容 |
| 报告某章失败 | 该章标记失败、其余章节继续；摘要不生成 | 指标仍正确，可用 |
| 信息提取失败 | 上传失败，不写财务数据；fail-closed | 错误数字会进入后续所有计算 |
| 标题生成失败 | 用首条消息截断；fail-open | 标题不是分析 |
| 检索出错 | 工具返回 `success: false`、"检索暂时失败"；agent 可换词重试，计入预算 | 与现有行为一致 |
| 检索为空 | 工具返回 `empty: true`；3 次都空则按 REQ §5.5 作答 | — |
| 拆分出现重复条款号（管理员上传） | 上传失败，不写条款；fail-closed | 错误条款号会成为错误出处 |
| 重新拆分的异常清单 | 停下，交 Jason 逐条裁定后才替换 | 领域判断 |

## 7 不变量

| 不变量 | 守住它的测试或检查 |
|--------|------------------|
| `openai` 包只在 `src/lib/ai/` 内导入 | 守护测试扫描 `src/` |
| 每次 AI 调用都带非空系统提示词 / `instructions` | 类型（必填参数）+ AI 入口单元测试（§system-prompt） |
| AI 请求不含 `max_tokens`、`temperature`，模型为 `gpt-6.1-sol` | AI 入口单元测试（§relay-model、§relay-params） |
| 报告中不出现兜底分析文字 | 报告节点测试（§report-section-failure） |
| 每个问题的检索执行不超过 3 次 | `tool-executor` 测试（§search-rounds） |
| 同一部法规内条款号严格递增、无重复 | 拆分器测试 + 重新拆分的核对（§reg-integrity） |
| 出处只来自检索结果 | 系统提示词 + 评测集（§citation-text，经 relay 运行） |

## 8 外部系统约束

**relay**（2026-10 用项目真实的提示词与工具定义、合成数据实测）：

- 模型：`gpt-5.6-*`、`gpt-6*`、`gpt-6.1-sol` 等 9 个；没有 `gpt-4o` 系列，不支持 `/embeddings`。
- 不带系统提示词（Chat Completions）或 `instructions`（Responses API）时，注入约 4200 token 的 Codex 编程 agent 提示词。
- `max_tokens` 不生效；对话、JSON 模式、严格 `json_schema`、工具调用、视觉输入、Responses API 的 PDF 文件输入均可用。
- `gpt-6.1-sol`：报告章节约 9s，短输出 2–17s；`gpt-6-luna` 短输出 12–84s。
- 按 token 计费，用量上限在 relay 侧设置。

**Supabase**：

- staging 与生产共用一个项目与 service_role 密钥：迁移一执行即作用于生产。
- PGroonga 3.2.5（装在 `extensions` schema）：两字词可检索；空格为 AND、`OR` 为或；默认 `pgroonga_score` 只是词频，要用 `pgroonga_condition(…, scorers => ARRAY['scorer_tf_idf($index)'], index_name => …)` 才有 TF-IDF。
- PDF 抽出的文字在词中间断行（"金\n融资产"），并夹有单独成行的页码；索引前去掉换行，页码行由拆分器删除（否则页码会粘进词中间）。
- 迁移历史与仓库文件不一致（TD-031）：不能用 `supabase db push`。
- Supabase MCP 遇到 `drop` 等破坏性语句要求客户端确认，Claude Code 显示不了确认框，请求被自动取消：删除语句由 Jason 在控制台的 SQL 编辑器执行。

## 9 其他设计

- **评测**（§retrieval-quality、§out-of-library、§citation-text）：`scripts/eval-retrieval.ts` 读仓库中的查询集，经 relay 跑完整 agent，在真实资料库上计算命中率。依赖 relay 与生产数据，不进 CI，Phase 4 运行并记录结果。查询集由 Claude 起草、Jason 审定。
- **CI**：构建与 E2E 的环境变量从 `OPENAI_API_KEY` 占位改为 `LLM_API_KEY` / `LLM_BASE_URL` 占位。

## 10 开放设计问题

无。
