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
| `src/lib/ai/`（AI 入口） | 本项目唯一调用 AI SDK 的地方。对外 4 个函数：`generateText`、`generateJSON`、`chatWithTools`、`readDocumentText`。内部决定模型、参数、时限、系统提示词的放法，判定成功与失败，把一切失败统一成 `AIUnavailableError` | core |
| `src/lib/search/`（检索） | 对外 2 个函数：`searchRegulations(keywords)` 返回带出处的条款，`searchKnowledge(keywords, filters)` 返回资料库切块。调数据库函数；关键词的规整、转义与排序都在数据库函数里 | IO |
| `src/lib/citations/`（引用，新） | 回答的后处理：把编号换成出处、删去未核实的条款号、按引用情况加标注。纯函数 | core |
| `src/lib/tools/search/*` | agent 工具：校验关键词、调 `src/lib/search/`、给每条结果分配编号并登记为证据。不含检索逻辑 | IO |
| `src/lib/workflows/core/`（agent 图） | 检索预算、强制作答、在保存前调用引用后处理；记忆存储作为参数注入 | core |
| `src/lib/extraction/regulation-splitter.ts`（新） | 法规原文（逐页）→ 条款列表 + 异常清单。纯函数，不碰数据库、不碰 AI | core |
| `scripts/resplit-regulations.ts`（新） | 一次性：Storage 原文件 → 逐页抽文字 → 拆分 → 核对 → 备份 → 逐文档原子替换 | IO |
| `src/lib/workflows/report/nodes/*` | 报告章节分析与摘要；失败时标记状态，不写兜底文字 | core |
| 报告渲染（`ReportSummary.tsx`、PDF、Word 生成器） | 按章节与摘要的状态显示失败文案 | IO |
| `scripts/eval-retrieval.ts`（新） | 评测：内存记忆存储 + 真实检索与 relay，按查询集打分 | IO |
| `supabase/tests/*.sql`（新） | 数据库层测试：在事务里造数据、查询、回滚 | IO |
| `scripts/smoke-test-staging.js` | 报告有失败章节或摘要未生成即判不通过（§smoke-report） | infra |

依赖方向：路由、工作流、工具 → `src/lib/search/`、`src/lib/citations/`、`src/lib/ai/`；`src/lib/search/` 与 `src/lib/citations/` 都不依赖 `src/lib/ai/`。守护：一条测试扫描 `src/`，`openai` 包只允许在 `src/lib/ai/` 内被导入。

不用"每个调用点各自修好"，因为 §system-prompt、§relay-params 这类规则散在 15 个调用点上就有 15 个漏处；集中后规则只写一遍，系统提示词是必填参数，漏传编译不过。

不让模型自己写条款号再由程序比对（REQ §5.4），因为模型写出的法规名称格式不一（简称、带不带年份），比对本身会出错；由程序按编号生成出处，出处就不可能是编的。

### 2.2 数据流

**对话（法规问题）**：

```
loadMemory → agentLoop ⇄ toolExecutor（检索 ≤ 3 次）
           → forceAnswer（仅在预算用尽或达到最大轮数时：不带工具再问一次）
           → finalizeAnswer（引用后处理）→ saveMemory → generateResponse
```

- 模型给出关键词调用 `search_regulations` → `searchRegulations` 以 PGroonga OR 查询、TF-IDF 排序取前 5 条 → 工具给每条分配编号 `R1…Rn`（本问题内连续编号，跨检索轮次不重复），登记到状态中的证据表 → 模型作答时写 `[R3]`。
- `finalizeAnswer` 调 `src/lib/citations/`：有效编号 → `《法规名》第 X 条`；无效编号与自写的"第 X 条"所在句子删去并在末尾提示；按 REQ §5.5 加标注。被引用的证据成为过程日志的来源链接。
- 保存进历史的是用户看到的版本（已替换出处）。

**报告**：指标由程序计算（不经 AI，金额与比率的计算点不变）→ 每章 `generateText` 写分析 → 某章失败则该章 `analysisStatus: 'failed'`、指标照留 → 任一章失败或摘要调用失败则摘要 `status: 'not_generated'` → 渲染时显示 REQ §5.2 的文案。

**上传**：文件 → 文字（文本型 PDF 直接抽；扫描件、图片经 `readDocumentText`）→ 切块写入 `document_chunks`（不再生成向量）→ 财务报表经 `generateJSON` 提取 → 所有期间校验通过后一次插入 `financial_data`。

**重新拆分（一次性）**：Storage 原文件 → `unpdf` 逐页抽文字（页数对不上即停）→ `regulation-splitter` → 异常清单交 Jason → 备份现表 → 核对文档集合与原文件未变 → 每份文档调一次 `replace_regulation_articles`（事务内删旧插新）→ 替换后再跑一遍完整性核对。

## 3 入口

| 角色 | 入口 | 本版变化 |
|------|------|---------|
| 财务人员 | `/api/chat/stream` | 检索改为 PGroonga；编号引用；AI 失败文案 |
| 财务人员 | `/api/reports/generate`、`/api/reports/parse-config` | 失败状态；改走统一入口 |
| 财务人员 | `/api/documents/upload-temp`、`/api/quick-actions/extract` | 不再生成向量；文字识别与提取走统一入口 |
| 管理员 | `/api/admin/upload-database-document` | 不再生成向量；新拆分器（只有 `REGULATION_TYPES` 拆分条款，公司制度不拆）；PDF 只解析一次，分页结果供拆分；法规 PDF 没有文字层、拆出 0 条、条款号重复、页数不符或存储失败都使上传失败；财务数据一次写入 |
| Claude（一次性） | `scripts/resplit-regulations.ts` | 新增 |
| Claude（Phase 4） | `scripts/eval-retrieval.ts`、`supabase/tests/*.sql` | 新增 |
| 部署 | `scripts/smoke-test-staging.js` | 检查报告失败状态 |

## 4 模块间契约

**AI 入口**（`src/lib/ai/`）：

- 4 个函数都要求非空的 `system`；`readDocumentText` 的系统提示词固定在入口内部（Responses API 放进 `instructions`）。
- 模型是代码中的常量 `gpt-6.1-sol`，不再从 `LLM_MODEL_*` / `OPENAI_*` 环境变量读取。凭据只读 `LLM_API_KEY`、`LLM_BASE_URL`。
- 每种用途在配置里有一个输出预算和一个时限。输出预算在 Chat Completions 映射为 `max_completion_tokens`，在 Responses API 映射为 `max_output_tokens`（新模型的推理 token 计入其中，预算按此留足）。时限：对话每轮 90s、报告每章 90s、文字识别 120s、其余 60s；SDK 重试 1 次。对话不用 60s：relay 正常时约 700 token 的长回答就要 25–77s（§8）。不传 `temperature`。
- 成功的判定按函数各自定义，不满足即抛 `AIUnavailableError`：

| 函数 | 成功 |
|------|------|
| `generateText` | `finish_reason` 为 `stop`，且文字非空白 |
| `generateJSON` | `finish_reason` 为 `stop`，能解析，且通过调用方给的 zod schema |
| `chatWithTools` | `finish_reason` 为 `stop` 且文字非空白；或为 `tool_calls` 且每个工具参数都能解析 |
| `readDocumentText` | Responses 状态为 `completed`（不是 `incomplete`），且文字非空白 |

  另外，任何函数遇到 `refusal`、`length`、`content_filter`，一律失败。调用方只处理 `AIUnavailableError` 这一种 AI 错误。

**检索**（`src/lib/search/`）：

- 入参是关键词数组：1–8 个，每个 2–10 个字，去重去空；工具的输入 schema 强制这一点。多个关键词按 OR 组合，用 `pgroonga_query_escape` 转义每个词；排序靠 TF-IDF，命中关键词越多、越稀有越靠前。
- `searchRegulations` 每条返回：`regulationName`、`articleNumber`、`content`、`documentId`、`fileUrl`、`score`。`searchKnowledge` 每条返回切块与所属文档。
- 空结果返回空数组，数据库出错抛错（工具层转成"检索暂时失败"）。
- 资料库范围（`doc_category = 'knowledge'` 且 `status = 'ready'`）写死在数据库函数里，不是参数。

**检索预算与收尾**（agent 图）：

- 状态新增：`searchCallsUsed`、证据表 `evidence`（编号 → 出处）、本问题的检索结果统计（成功 / 为空 / 出错 各几次）。每个新问题重置。
- 第 4 次及以后的检索请求不执行，返回独立的结果 `{ status: 'budget_exhausted' }`（不是 `empty`）。两个检索工具合计计数；一次回复里并发多个检索时按顺序计数。
- 预算用尽后，或达到最大轮数时，进入 `forceAnswer`：不提供任何工具再调一次 `chatWithTools`。仍失败则按对话失败处理。
- 保存历史时，不保存没有配对工具结果的工具调用。

**引用后处理**（`src/lib/citations/`）：

- 入参：模型回答、证据表、本问题是否调用过法规检索、检索结果统计。出参：最终文字、被引用的证据（供过程日志链接）、删去的句子数。
- 规则：`[Rn]` 有效 → `《法规名》第 X 条`；无效编号、不成格式的编号（`R3`、`[R1-R3]`）、有效编号后自写的款、项、之 X，或不是由编号生成的"第 X 条"→ 删去所在句子，末尾提示 REQ §5.4 的文案。检查按页面显示的样子进行（去掉加粗等格式标记，全角、大写数字与数字同等对待），因为渲染后它们都是条款号。分句以 。！？为界；没有结束的句子跨行仍是一句，列表项、标题、表格行各自成句：只删去含条款号的那一行，会把有条件的结论变成无条件的。调用过或请求过法规检索、且没有有效编号 → 开头加资料库外标注；执行过的法规检索全部出错 → 开头改加检索失败标注；模型在开头已写同样的标注（含加粗）则不重复。
- 历史对话只恢复问题与最终回答，不恢复工具结果：编号每个问题重新从 R1 开始，旧结果里的 `R1` 会被当成本问题的证据。
- 已知代价：模型原样转述某条条款里的交叉引用（"按照本准则第二十五条"）时，这句也会被删。宁可多删，不放过编造。

**出处名称**：由 `regulation_name` 推导：`企业会计准则第22号-金融工具的确认和计量-2018` → `《企业会计准则第22号——金融工具的确认和计量》`（去掉末尾版本年份）。纯函数，测试覆盖 45 个现有名称。

**过程日志**：`ProcessEvent.sourceReference`（单个）改为 `sourceReferences`（数组），`SourceReference` 增加可选的 `article`。过程事件只在前端内存中，不入库，没有旧数据要兼容。

**记忆存储**：`createUnifiedGraph({ memory })`。生产传入现有的 Supabase 记忆；评测传入内存实现，整个评测不写数据库。

**报告内容**（存入 `reports` 的 JSON）：

- `ReportSection` 增加 `analysisStatus: 'ok' | 'failed'`；失败时 `analysis` 为 REQ §5.2 的文案，`metrics` 照常。
- `ReportSummary` 增加 `status: 'ok' | 'not_generated'` 与 `reason`；未生成时三个列表为空。
- 已存的旧报告没有这两个字段，渲染时按 `'ok'` 处理。

## 5 持久化数据

| 表 | 粒度 | 本版变化 |
|----|------|---------|
| `structured_regulations` | 一行 = 一部法规的一条条款 | 数据整体替换（REQ §5.6）；新增生成列 `search_text`（去掉换行的正文）及其 PGroonga 索引 |
| `backup.structured_regulations_v4_6` | 替换前的整表副本（`backup` schema 不经 Data API 暴露，无需授权） | 新增；Phase 6 删除 |
| `document_chunks` | 一行 = 一个文档切块 | 新增生成列 `search_text` 及 PGroonga 索引；`embedding` 列已删除（`20261022073400_remove_vector_search`） |
| `documents` | 一行 = 一份文档 | 不变 |

新增数据库函数：

- `search_regulation_articles(p_keywords text[], p_limit)`、`search_knowledge_chunks(p_keywords text[], p_limit, p_year, p_doc_types text[])`：关键词以数组传入，函数内逐个规整（康熙部首映射、去空白）与转义后以 OR 组合；先按命中的不同关键词个数、再按 `scorer_tf_idf` 排序（只用 TF-IDF 时，一条把同一个词重复多次的条款会排在两个词都含的条款前面）；后者把资料库范围写死（就绪的知识文档，排除 `regulation`、`accounting_standard`），且每份文档最多返回 2 块：年报的切块数是其他文档的十倍，其附注表格又含同样的会计术语，不加限制时会占满前几条，把公司制度挤出去。检索列 `search_text` 由 `search_normalize(content)` 生成。
- `replace_regulation_articles(p_document_id, p_articles jsonb)`：一个函数调用即一个事务，删去该文档的旧条款、插入新条款；可重复执行。

Phase 6 删除：`match_documents`、`search_documents_hybrid`、`search_regulations_hybrid`、`embedding` 列、`backup` schema（含备份表）、`vector` 扩展（若无他用）。删除语句由 Jason 在控制台执行（§8）。

迁移规则：本版迁移只增不删，直到 Phase 6（REQ §6.1）。每个迁移经 Supabase MCP 执行后，以数据库登记的编号同时提交到 `supabase/migrations/`（TD-031）。逐列定义见 `src/lib/database/types.ts`，迁移后重新生成。

## 6 异常流

| 触发 | 去向 | 理由 |
|------|------|------|
| AI 调用失败（任何用途，按 §4 的判定） | 抛 `AIUnavailableError`，调用方转成 REQ §5.2 的文案；fail-closed | 宁可显示失败，不显示编造或残缺的内容 |
| 报告某章失败 | 该章标记失败、其余章节继续；摘要不生成 | 指标仍正确，可用 |
| 信息提取失败，或任一期间校验失败 | 上传失败，不写财务数据；fail-closed | 错误数字会进入后续所有计算 |
| 标题生成失败 | 用首条消息截断；fail-open | 标题不是分析 |
| 检索出错 | 工具返回 `success: false`、"检索暂时失败"；计入预算；执行过的法规检索全部出错时加检索失败标注（文档检索不参与判定） | 出错不等于资料库里没有；法规问题的标注只由法规检索决定 |
| 检索参数不合格 | 注册表返回 `invalidInput`，工具未执行；计入预算，不算出错 | 关键词写坏了不是数据库故障 |
| 检索预算用尽 / 达到最大轮数 | `forceAnswer` 不带工具作答 | 保证有终态、历史中无未配对调用 |
| 回答含未核实的条款号 | 删去所在句子并提示 | 出处只能来自检索结果 |
| 管理员上传法规：拆出重复条款号，或原文件存储失败 | 上传失败，不写文档与条款；fail-closed | 错误条款号会成为错误出处；没有原文件的出处无法核对 |
| 重新拆分：页数对不上 / 异常清单非空 | 停下，交 Jason 裁定后才替换 | 领域判断 |
| 重新拆分：替换中途中断 | 已替换的文档保持新数据，未替换的保持旧数据；重跑即可 | 每份文档一个事务 |

## 7 不变量

| 不变量 | 守住它的测试或检查 |
|--------|------------------|
| `openai` 包只在 `src/lib/ai/` 内导入 | 守护测试扫描 `src/` |
| 每次 AI 调用都带非空系统提示词 / `instructions` | 类型（必填参数）+ AI 入口单元测试（§system-prompt） |
| 模型为 `gpt-6.1-sol`；两种 API 用各自的输出上限字段，不含 `max_tokens`、`temperature` | AI 入口单元测试（§relay-model、§relay-params） |
| 截断、拒绝、空白输出不会被当作成功 | AI 入口单元测试（§ai-outcome、§ai-timeout） |
| 报告中不出现兜底分析文字 | 报告节点测试（§report-section-failure） |
| 每个问题执行的检索不超过 3 次，且总有终态 | agent 图测试（§search-rounds） |
| 发给用户的每个条款号都来自本问题的检索结果 | 引用后处理测试（§citation-text） |
| 同一部法规内条款号逐一连续、无重复，无无归属正文 | 拆分器测试 + 重新拆分的核对（§reg-integrity） |
| 文档检索只返回资料库中就绪的文档 | 数据库层测试（§doc-search） |
| 评测不写数据库 | 评测前后核对会话与消息行数不变 |

## 8 外部系统约束

**relay**（2026-10 用项目真实的提示词与工具定义、合成数据实测）：

- 模型：`gpt-5.6-*`、`gpt-6*`、`gpt-6.1-sol` 等 9 个；没有 `gpt-4o` 系列，不支持 `/embeddings`。
- 不带系统提示词（Chat Completions）或 `instructions`（Responses API）时，注入约 4200 token 的 Codex 编程 agent 提示词。
- 输出上限都不生效：`max_tokens`、`max_completion_tokens`、`max_output_tokens` 设为 64 时仍返回约 700 token，状态照常为完成。对话、JSON 模式、严格 `json_schema`、工具调用、视觉输入，以及 Responses API 的 PDF 与图片输入均可用。
- `gpt-6.1-sol`：报告章节约 9s，短输出 2–19s；约 700 token 的长输出 25–77s；`gpt-6-luna` 短输出 12–84s。高峰时返回 529（服务暂时不可用）；服务商升级系统期间连续数十分钟 529，升级刚完成时模型列表里有 `gpt-6.1-sol` 但请求返回 404 `model_not_found`。同一检索评测（20 个完整对话）在不同时段的 P50 为 20.7–54s。
- 严格 `json_schema` 的每个字段都会被输出：一个字段对应一个指标的提取 schema（约 200 个字段）单期就要约 4600 token、68s；改为只列出现的指标（指标名用枚举约束）后约 15s。
- 按 token 计费，用量上限在 relay 侧设置。
- OpenAI SDK 默认时限 10 分钟、重试 2 次（`node_modules/openai/src/client.ts`）：必须由 AI 入口显式覆盖。

**Supabase**：

- staging 与生产共用一个项目与 service_role 密钥：迁移一执行即作用于生产。
- PGroonga 3.2.5（装在 `extensions` schema）：两字词可检索；空格为 AND、`OR` 为或；默认 `pgroonga_score` 只是词频，要用 `pgroonga_condition(…, scorers => ARRAY['scorer_tf_idf($index)'], index_name => …)` 才有 TF-IDF。非 ASCII 文本按相邻两字切分（bigram），不是语义分词。
- PDF 抽出的文字在词中间断行（"金\n融资产"），并夹有单独成行的页码；索引前去掉换行，页码行由拆分器删除（否则页码会粘进词中间）。
- 45 份法规原文件都在 Storage 的 `document-files` 中（已核）。
- 部分 PDF（尤其是浏览器打印的法律文本）用康熙部首代替形近的汉字（"⼈"代"人"），按 NFKC 即可还原；唯一例外是"⼜"（U+2F1C，"又"的部首）被用来印"口"，库内 98 处全是出口、进口、敞口，拆分器与 `search_normalize` 都把它映射为"口"。2007 版准则"第X条"后不带空格；部分行两端对齐、字间有空格。
- 服务端多数数据库调用用的是 anon 密钥（`createServerSupabaseClient`），不是 service_role。自 2026-10-30 起，`public` 中新建的表不再自动授权给 Data API 角色：应用经 supabase-js 访问的新表，须在建表的同一迁移里显式 `grant`。本版唯一的新表是 `backup` schema 中的备份表，不经 Data API 访问。新函数仍默认可由 anon 执行；`replace_regulation_articles` 在迁移里收回了 anon / authenticated 的执行权，只给 service_role（重新拆分脚本用）。
- 迁移历史与仓库文件不一致（TD-031）：不能用 `supabase db push`。
- Supabase MCP 的 `apply_migration`，以及 `execute_sql` 中含 `drop`、`delete`、`revoke` 等的语句，都要求客户端确认；Claude Code 显示不了确认框，请求被自动取消。这类迁移由 Jason 在控制台的 SQL 编辑器执行，Claude 随后把同一版本号登记进 `supabase_migrations.schema_migrations`，使仓库文件与数据库记录一致。
- 重新拆分与评测脚本的凭据放在本机 `.env.scripts`（`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`），只由脚本显式读取；本机 `.env` 不含生产凭据，`npm run dev` 连不到生产库。

## 9 其他设计

- **评测**（§retrieval-quality、§out-of-library 的评测部分）：`scripts/eval-retrieval.ts` 读仓库中的查询集，用内存记忆存储跑完整 agent（真实检索、真实 relay），记录每个问题的检索轨迹与最终回答并打分。不进 CI，Phase 4 运行并记录结果。查询集由 Claude 起草、Jason 审定。
- **数据库层测试**（§keyword-match、§doc-search）：`supabase/tests/*.sql` 在一个事务里插入固定样例（含同词的用户文档与未就绪文档）、调用检索函数、断言结果、最后回滚，不留数据。经 Supabase MCP 运行，不进 CI。
- **CI**：构建与 E2E 的环境变量从 `OPENAI_API_KEY` 占位改为 `LLM_API_KEY` / `LLM_BASE_URL` 占位。

## 10 开放设计问题

无。
