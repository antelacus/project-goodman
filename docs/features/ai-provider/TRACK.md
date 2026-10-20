# TRACK — ai-provider v4.7.0

## 一、范围与裁定

- 模式：standard · 目标：AI 服务恢复可用并换到第三方 relay 与新模型；去掉 embedding；AI 调用失败时用户看到的是失败，而不是编造的分析
- 范围：
  1. relay 切换：`LLM_BASE_URL` / `LLM_API_KEY` 指向 relay；所有 AI 用途都用 `gpt-6.1-sol`；调用参数按官方模型的要求写（官方的新模型不接受 `max_tokens`，要用 `max_completion_tokens`）
  2. 每次 AI 调用都带系统提示词，由测试守住
  3. AI 调用失败时不再编造：报告章节明确显示失败，摘要不以兜底文字冒充结论；冒烟测试检查报告里没有失败的章节
  4. 去掉 embedding：改为关键词加 agentic 检索，中文检索要能分词；以测试查询集证明检索质量不低于现状；移除上传时的向量化与代码中对 Edge Function `embed` 的调用（该函数在 Supabase 上并不存在，调用一直失败后回退到直接调 embedding），数据库的向量列与函数先扩后缩
  5. 上传与文档检索恢复可用
  6. VPS 上的 `.env` 在部署时更新，先 staging、后生产；值不经过对话
  7. 结构化条款重新拆分：修正拆分规则，45 部法规与准则从原文件重新拆分并核对（REQ §5.6）
- 明确不做：发布流水线（顺延，见 `docs/features/release-pipeline/TRACK.md`）；TD-024 的报告耗时优化（本版只在 Phase 4 重新测量）；其他新功能
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束：`DESIGN.md` §8
  - 现状：staging 与生产共用一个 Supabase 项目与 service_role 密钥（见 `docs/features/release-pipeline/TRACK.md` 外部约束）；本版不扩大 staging 对生产数据的写入
  - The Floor：生产库的文档都是公开数据，经 relay 传输可接受；测试与评测用合成数据或公开数据
- 裁定：
  - 2026-10-19 · 改用第三方 relay（Codex 订阅转售，按 token 计费，比官方便宜）；按 OpenAI 官方模型对待其模型 · Jason · 级联：REQ、DESIGN 外部约束（待开）
  - 2026-10-19 · 生产库的文档都是公开数据，经 relay 传输可接受 · Jason · 级联：本 TRACK 全局约束
  - 2026-10-19 · 不再使用 embedding，改为关键词加 agentic 检索（方案 C）；理由：只为 embedding 保留官方 API 不划算 · Jason · 级联：REQ、DESIGN（待开）
  - 2026-10-19 · 对话与报告用 `gpt-6.1-sol` · Jason · 级联：REQ
  - 2026-10-19 · AI 失败时编造"各项指标表现正常"的缺陷（P0，TD-030）不走 hotfix，在本版修复；理由：访问量很低，接受在 v4.7.0 上线前生产报告仍可能显示编造的结论 · Jason · 级联：本 TRACK 范围 3、`docs/TECHNICAL_DEBT.md`
  - 2026-10-19 · 版本顺序：v4.7.0 改为 AI 服务切换，发布流水线顺延；理由：AI 不通则流水线的 staging 检查无法验证 · Jason · 级联：`v4_DEVELOPMENT_PLAN.md` §3.11、§3.12
  - 2026-10-20 · 所有 AI 用途（含标题、报告配置解析、信息提取）都用 `gpt-6.1-sol`；理由：`gpt-6-luna` 短输出实测 12–84s，按标价每次只省约 0.0004 美元 · Jason · 级联：REQ §5.1、本 TRACK 范围 1
  - 2026-10-20 · 资料库外的问题可凭模型知识作答，须标注"不是来自资料库"且不写条款号 · Jason · 级联：REQ §5.5
  - 2026-10-20 · 向量列、向量函数、Edge Function `embed` 在生产验证 v4.7.0 后于 Phase 6 删除（不可逆）；理由：回滚到 v4.6.4 无意义，保留向量只对回到 `text-embedding-3-small` 有用，不在计划内 · Jason · 级联：REQ §5.8
  - 2026-10-20 · 结构化条款在本版重新拆分（推翻 REQ 原先的"只核对、不重新拆分"）；理由：Phase 2 重复检查发现 170 个条款号重复、涉及 438 行（28%），拆分规则把正文里的交叉引用当成条款开头，直接用作出处会给出错误的条款号；v4.6.4 不读这张表，替换不影响运行中的生产 · Jason · 级联：REQ §1.2、§5.6、§6.1、§7，本 TRACK 范围 7
  - 2026-10-20 · 所有 AI 调用集中到 `src/lib/ai/` 的统一入口（4 个函数，系统提示词必填，SDK 只许在此导入） · Jason · 级联：DESIGN §2.1、§4、§7
  - 2026-10-20 · 中文检索用 PGroonga（TF-IDF 排序），关键词由 agent 给出 · Jason · 级联：DESIGN §4、§5、§8
  - 2026-10-20 · 检索上限 3 次由代码强制、提示词同时告知 · Jason · 级联：DESIGN §4
  - 2026-10-20 · 重新拆分的异常清单（1 条）：《企业会计准则第 10 号——企业年金基金》第 5–6 页附录（两张报表格式）从检索中排除，不归入任何条款 · Jason · 级联：Phase 4 证据
  - 2026-10-20 · 用重新拆分的结果替换生产的结构化条款；备份放在 `backup` schema（不经 Data API 暴露） · Jason · 级联：DESIGN §5
  - 2026-10-20 · Codex 设计评审 13 条全部采纳；出处改为编号引用、由程序生成（C1 方案 A），资料库外标注由程序按引用判定；C8 降为 SHOULD · Jason · 级联：REQ §5.1–§5.7、§6.1、§7，DESIGN 全篇

## 二、批次

| 批次 | 状态 | 范围（REQ §-id） | 依赖 |
|------|------|-----------------|------|
| B1 AI 统一入口 | 完成 | `src/lib/ai/` 4 个函数、成功判定、时限与重试、`AIUnavailableError`；15 个调用点迁入；去掉 `LLM_MODEL_*` / `OPENAI_*` 回退；CI 环境变量 · §relay-model、§relay-params、§system-prompt、§ai-outcome、§ai-timeout | — |
| B2 失败不编造 | 完成 | 报告章节与摘要状态、三处渲染、对话失败文案、两个上传入口的提取失败与多期间一次写入、冒烟检查 · §report-section-failure、§report-summary-failure、§chat-failure、§extract-failure、§smoke-report | B1 |
| B3 条款重新拆分 | 完成 | `regulation-splitter`（逐页、连续编号、无归属正文）、管理员上传改用并在存储失败时失败、`replace_regulation_articles`、`resplit-regulations` 脚本与异常清单（Jason 裁定后才替换）· §reg-split-rule、§reg-integrity、§reg-upload-dup、§reg-upload-storage | — |
| B4 关键词检索与引用 | 进行中 | PGroonga 迁移（生成列、索引、3 个函数）、`src/lib/search/`、两个工具与证据编号、检索预算与 `forceAnswer`、`src/lib/citations/`、过程日志链接、系统提示词、上传去向量、数据库层测试 · §reg-search-citation、§search-rounds、§keyword-match、§citation-text、§citation-link、§out-of-library、§retrieval-error、§doc-search、§upload-no-embedding、§no-embedding-calls | B1、B3（替换完成） |
| B5 评测 | 未开始 | 记忆存储注入、查询集（Claude 起草、Jason 审定）与 `eval-retrieval` 脚本 · §retrieval-quality，以及 §out-of-library 的评测部分 | B4 |

Phase 6：§vector-removed（删除向量列、向量函数、`backup` schema）。

## 三、门与发布

**评审发现登记**（Codex Phase 2 设计评审，REQ + DESIGN；引文均已对源码核实）：

| # | 级别 | 发现 | status |
|---|------|------|--------|
| C1 | MUST | §citation-text 只要求"含一条正确出处"，正确出处可掩盖编造的出处；没有引用校验环节 | 已采纳（方案 A：编号引用、程序生成出处）· 待 §citation-text 通过后关闭 |
| C2 | MUST | 行首规则 + 递增不足以证明拆分正确；覆盖检查若只比对拆分器自己的输入，漏页也会 100% | 已采纳 · 待 §reg-integrity 通过后关闭 |
| C3 | MUST | 替换期间旧生产仍可用旧拆分器上传法规；替换缺原子性与中断恢复 | 已采纳（逐文档事务替换；核对到上线期间不在生产上传法规）· 待 §reg-integrity 与替换后复核通过后关闭 |
| C4 | MUST | "空内容即失败"会误杀只含工具调用的回复；截断输出（`finish_reason: length`）会被当成功 | 已采纳 · 待 §ai-outcome 通过后关闭 |
| C5 | MUST | Responses API 的输出上限字段是 `max_output_tokens`，不是 `max_completion_tokens` | 已采纳 · 待 §relay-params 通过后关闭 |
| C6 | MUST | 资料库外作答只在"3 次都空"时触发；非空但无关、部分支持、检索报错都没有终态规则 | 已采纳（由引用后处理按编号判定标注）· 待 §out-of-library、§retrieval-error 通过后关闭 |
| C7 | MUST | 评测跑完整 agent 会创建会话、写消息到共用的生产库 | 已采纳（内存记忆存储）· 由评测前后行数核对关闭 |
| C8 | SHOULD（原 MUST） | 管理员上传在 Storage 失败时仍写入法规，`file_url` 为空，出处链接打不开（现有 45 份原件均在 Storage，已核） | 已采纳（Jason 同意按 SHOULD 处理）· 待 §reg-upload-storage 通过后关闭 |
| C9 | SHOULD | 预算用尽返回 `empty: true` 与真实空结果混淆；模型不收尾时撞上最大迭代，会保存未配对的工具调用 | 已采纳 · 待 §search-rounds 通过后关闭 |
| C10 | SHOULD | 关键词粒度、数量、组合方式未定义；"不相邻命中"要在数据库层用固定样例直接验证 | 已采纳 · 待 §keyword-match 通过后关闭 |
| C11 | SHOULD | 管理员上传按期间逐条写 `financial_data`，第二期校验失败时第一期已落库 | 已采纳 · 待 §extract-failure 通过后关闭 |
| C12 | SHOULD | SDK 默认超时 10 分钟 × 重试 2 次；relay 挂起时用户等不到失败提示 | 已采纳（时限初值 60/90/120s，重试 1 次）· 待 §ai-timeout 通过后关闭 |
| C13 | SHOULD | 新检索函数须把"只搜资料库、只搜就绪文档"写死在数据库查询里 | 已采纳 · 待 §doc-search 通过后关闭 |

**Phase 4 证据**：

- §reg-integrity（45 部真实法规，2026-10-20）：`scripts/resplit-regulations.ts check` 第一轮 1196 条、18 条异常，其中 17 条是拆分规则的问题（康熙部首、2007 版准则无空格、字间距排版、浏览器页眉页脚），修正规则后 1505 条、1 条异常，已由 Jason 裁定（见裁定）。`apply` 后脚本逐条读回比对通过；SQL 独立核对：45 份文档均有条款，重复 0，条款内容中的章节标题 0、页码行 0、康熙部首 0。条款数与原文一致可核的：企业所得税法 60、关税法 72、增值税法 38、基本准则 50。替换前整表 1559 行备份于 `backup.structured_regulations_v4_6`，与原表逐行一致。

**Phase 6 boxes**：Phase 4 收尾时写入；已知必须包含：relay 用量上限已设（Jason）· VPS 上 staging、生产两份 `.env` 先后更新并备份，删除不再使用的 `OPENAI_API_KEY` · 生产验证后删除向量列、向量函数（REQ §5.8）· TD-021 改写为 relay 现状 · TD-024 重新测量

## 四、Session-end pickup

（2026-10-20）B4 进行中，工作区为半成品提交（测试未全绿）：
- 已完成：PGroonga 迁移三条（已执行、已入仓库）、`supabase/tests/keyword-search.sql`（通过）、`src/lib/search/`、`src/lib/citations/`、两个检索工具、执行器（预算与证据编号）、`forceAnswer` / `finalizeAnswer` 节点、`createUnifiedGraph({ memory })`、`src/lib/memory/in-memory.ts`、过程日志 `sourceReferences`。B4 验收 9 条中 6 条已通过。
- 已删除：向量 RPC 包装（`helpers.ts`、`custom-types.ts`、两处导出）、`src/lib/documents/search.ts`。
- 下一步（按序）：
  1. `src/lib/ai/client.ts` 删 `getLLMClient`、`config.ts` 删 `EMBEDDING_MODEL`；`upload-temp` 与管理员上传去掉生成向量（切块不写 `embedding`，删 `generateEmbeddings`）。
  2. 修测试：`tests/unit/database/helpers.test.ts` 删三个向量 RPC 用例；`tests/unit/tools/search-tools.test.ts` 改为 mock `@/lib/search`；`tests/unit/workflows/save-memory.test.ts` 改用 `createSaveMemoryNode(mockMemory)`；B3 验收文件去掉 `@/lib/ai/client` 的 mock；其余 mock `openai` 做 embedding 的测试改掉。
  3. 更新 `src/lib/ai/prompts/chat-system.md`：关键词检索用法、每题最多 3 次、只写编号 `[Rn]` 不写条款号、资料库外可作答但不写条款号。
  4. 跑全套 tsc / eslint / vitest，B4 验收 9 条全绿后提交；REQ §5.3 的"1559 条"改为 1505；DESIGN §5 函数签名改为关键词数组。
  5. 然后进入 B5（评测脚本与查询集，查询集交 Jason 审定）。

