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
  - 2026-10-21 · 文档检索排除法规与会计准则（推翻 REQ §5.7 原先的"范围不变"）；理由：评测第一轮口语法规题经文档检索读到准则原文作答，没有证据编号，也不触发资料库外标注，绕开了出处保证 · Jason · 级联：REQ §5.7（新增 §doc-search-no-regulation）、DESIGN §5
  - 2026-10-21 · 检索评测查询集（20 条）审定 · Jason · 级联：`scripts/eval-retrieval-queries.json`
  - 2026-10-21 · doc-5 未命中（表格被切块切开）本版接受，登记 TD-033 · Jason · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-10-21 · 检索分流按问题性质：问规则本身（准则、税法怎么规定）必须查法规检索，以原文为准；问公司自己的做法查文档；两者都涉及时都查、分开说明。推翻原先的"未明确要求查准则时先查公司文档"；理由：评测第三轮 7 道法规题都以年报转述的会计政策作答，没有查准则 · Jason · 级联：`chat-system.md` v1.5
  - 2026-10-21 · 文档检索每份文档最多返回 2 块；理由：年报 135 块占满前 5 条，公司制度排到 20 名之外 · Jason · 级联：DESIGN §5
  - 2026-10-21 · §retrieval-quality 以连续两轮评测都达标为准；理由：模型每轮选的关键词不同，单轮波动大 · Jason · 级联：REQ §5.3
  - 2026-10-22 · 对话单次调用时限由 60s 放宽到 90s；理由：relay 正常时长回答就要 25–77s，60s 会把正常回答判为失败 · Jason · 级联：`src/lib/ai/config.ts`、DESIGN §4
  - 2026-10-22 · 维持"报告耗时本版只测量、不优化"：报告 P50 94s（V4.6 为 57s）；章节并行调用留给 TD-024，并行请求下 relay 的 529 率未测 · Jason · 级联：TD-024（Phase 6 改写）
  - 2026-10-22 · Codex 上线前审查：A 组（出处）、B 组（AI 失败处理）按 Claude 建议修复；资料库外标注以做过或请求过法规检索为前提，改 REQ 措辞而不改代码（P16）；P7 不修、不登记 · Jason · 级联：REQ §5.5、DESIGN §4、本 TRACK 批次 B6
  - 2026-10-22 · P17 改 REQ 措辞：多期间校验只属管理员上传（推翻原先"修代码"，那条裁定依据的描述有误：用户提取接口不分期间、不写财务数据） · Jason · 级联：REQ §5.2
  - 2026-10-22 · 出处检查会删去回答中引用用户自己文档条款（"合同第五条"）的句子，本版接受，登记 TD-034 · Jason · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-10-22 · 相邻的引用（"[R1][R3]"）合并为一串显示，同一法规只写一次名称，在 Phase 5 修；理由：staging 复演中两条出处首尾相接、难读 · Jason · 级联：`src/lib/citations/`
  - 2026-10-22 · `/code-review` 10 条按 Claude 建议处理：V1–V4、V6–V8 修复；V5 以提示词缓解、TD-034 扩写并升为高；V9 不改；V10 加注释 · Jason · 级联：REQ §5.5、DESIGN §4、`chat-system.md` v1.6、`docs/TECHNICAL_DEBT.md`

## 二、批次

| 批次 | 状态 | 范围（REQ §-id） | 依赖 |
|------|------|-----------------|------|
| B1 AI 统一入口 | 完成 | `src/lib/ai/` 4 个函数、成功判定、时限与重试、`AIUnavailableError`；15 个调用点迁入；去掉 `LLM_MODEL_*` / `OPENAI_*` 回退；CI 环境变量 · §relay-model、§relay-params、§system-prompt、§ai-outcome、§ai-timeout | — |
| B2 失败不编造 | 完成 | 报告章节与摘要状态、三处渲染、对话失败文案、两个上传入口的提取失败与多期间一次写入、冒烟检查 · §report-section-failure、§report-summary-failure、§chat-failure、§extract-failure、§smoke-report | B1 |
| B3 条款重新拆分 | 完成 | `regulation-splitter`（逐页、连续编号、无归属正文）、管理员上传改用并在存储失败时失败、`replace_regulation_articles`、`resplit-regulations` 脚本与异常清单（Jason 裁定后才替换）· §reg-split-rule、§reg-integrity、§reg-upload-dup、§reg-upload-storage | — |
| B4 关键词检索与引用 | 完成 | PGroonga 迁移（生成列、索引、3 个函数）、`src/lib/search/`、两个工具与证据编号、检索预算与 `forceAnswer`、`src/lib/citations/`、过程日志链接、系统提示词、上传去向量、数据库层测试 · §reg-search-citation、§search-rounds、§keyword-match、§citation-text、§citation-link、§out-of-library、§retrieval-error、§doc-search、§upload-no-embedding、§no-embedding-calls | B1、B3（替换完成） |
| B5 评测 | 完成 | 记忆存储注入、查询集（Claude 起草、Jason 审定）与 `eval-retrieval` 脚本 · §retrieval-quality，以及 §out-of-library 的评测部分 | B4 |
| B6 上线前修复 | 完成，待 staging 重演 | Codex 上线前审查的 P1–P6、P9–P15、P18–P24：出处检查按显示文本判断、整句分句、编号后自写款项；预算拒绝的法规检索也加标注；历史只恢复问答；AI 入口的时限、截断与异常回复；报告指标失败不算同比；测试与评测脚本的缺口 · §citation-text、§out-of-library、§search-rounds、§ai-outcome、§ai-timeout、§report-section-failure、§system-prompt、§doc-search-no-regulation、§upload-no-embedding、§citation-link | B5 |

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
| C7 | MUST | 评测跑完整 agent 会创建会话、写消息到共用的生产库 | 已关闭：五轮评测前后会话、消息行数均不变 |
| C8 | SHOULD（原 MUST） | 管理员上传在 Storage 失败时仍写入法规，`file_url` 为空，出处链接打不开（现有 45 份原件均在 Storage，已核） | 已采纳（Jason 同意按 SHOULD 处理）· 待 §reg-upload-storage 通过后关闭 |
| C9 | SHOULD | 预算用尽返回 `empty: true` 与真实空结果混淆；模型不收尾时撞上最大迭代，会保存未配对的工具调用 | 已采纳 · 待 §search-rounds 通过后关闭 |
| C10 | SHOULD | 关键词粒度、数量、组合方式未定义；"不相邻命中"要在数据库层用固定样例直接验证 | 已采纳 · 待 §keyword-match 通过后关闭 |
| C11 | SHOULD | 管理员上传按期间逐条写 `financial_data`，第二期校验失败时第一期已落库 | 已采纳 · 待 §extract-failure 通过后关闭 |
| C12 | SHOULD | SDK 默认超时 10 分钟 × 重试 2 次；relay 挂起时用户等不到失败提示 | 已采纳（时限初值 60/90/120s，重试 1 次）· 待 §ai-timeout 通过后关闭 |
| C13 | SHOULD | 新检索函数须把"只搜资料库、只搜就绪文档"写死在数据库查询里 | 已采纳 · 待 §doc-search 通过后关闭 |

**评审发现登记**（Codex 上线前审查，3 个只读任务、各 2 个文件；引文均已对源码逐行核实；"已复现"为 Claude 另行复现）：

| # | 级别 | 发现 | status |
|---|------|------|--------|
| P1 | MUST | `[R1]` 后自写的"第二款""之二"拼进出处，生成未经检索的款号（`citations/index.ts:44`）· 已复现 | 已修 |
| P2 | MUST | 记忆恢复的旧工具结果带旧编号，与本问题新编号同名，旧引用被换成新出处（`tool-executor.ts:88`、`load-memory.ts:111`） | 已修 |
| P3 | MUST | 条款号检查漏掉 `第**十九**条`、全角数字、大写数字、`3条`；加粗写法渲染后显示为"第十九条"（`citations/index.ts:24`）· 已复现 | 已修 |
| P4 | MUST | 编号写成 `[R 1]`、`［R1］`、`R1`、`[R1-R3]` 时不识别也不删除（`citations/index.ts:23`）· 已复现 | 已修 |
| P5 | MUST | 按换行切句：删去含条款号的条件行，留下失去条件的结论（`citations/index.ts:26`）· 已复现 | 已修 |
| P6 | MUST | 3 次文档检索后再请求法规检索被预算拒绝，`regulationSearched` 为假，回答不加任何标注（`tool-executor.ts:43`） | 已修 |
| P7 | MUST | 不显示的 Markdown 链接定义里的 `[R1]` 也算有效引用，关闭资料库外标注（`citations/index.ts:53`） | Jason 裁定：降级，不修、不登记技术债；理由：模型不会写不显示的 Markdown 链接定义 |
| P8 | MUST | 先删正文中的标注文字再校验，可拼出 `第3条` 或无效编号（`citations/index.ts:64`） | 已修（随 P9：只识别开头的标注，正文中引用的标注文字不动） |
| P9 | SHOULD | 模型写的加粗标注不被识别，标注显示两次（`citations/index.ts:64`） | 已修 |
| P10 | MUST | 指标计算失败的占位值 0 参与同比，显示"-100.00%"或"0.00%"（`analyze-sections.ts:26`；自 `dfc9072` 起即如此，现有报告未出现过） | 已修（报告表格与分析提示词两处） |
| P11 | MUST | Responses API 顶层完成、但单条消息未完成时，截断文字被当作成功（`ai/index.ts:251`） | 已修 |
| P12 | MUST | 强制作答（不给工具）时 relay 仍返回工具调用，被当作成功，用户只看到一句标注（`ai/index.ts:131`） | 已修 |
| P13 | MUST | 工具参数为空字符串时补成 `{}`，不按无法解析判失败（`ai/index.ts:240`） | 已修 |
| P14 | MUST | 时限不打断 SDK 重试前的等待：带 `Retry-After` 时失败提示晚于时限（`ai/index.ts:196`） | 已修 |
| P15 | SHOULD | HTTP 200 但响应体残缺时抛出原始错误，不转为 `AIUnavailableError`；报告章节丢掉已算好的指标（`ai/index.ts:201`、`:213`） | 已修 |
| P16 | MUST | 测试认可"未做法规检索的回答不加标注"，REQ §5.5 的字面没有这一例外（`b4-search-citations.test.ts:231`） | Jason 裁定：改 REQ 措辞（§5.5 写明以做过或请求过法规检索为前提），代码不变 |
| P17 | MUST | 第二期校验失败只测了管理员上传，用户提取接口未测（`b2-failures-shown.test.ts:212`、`extract/route.ts:33`） | Jason 裁定：改 REQ 措辞（§5.2 与 §extract-failure 写明多期间校验只属管理员上传；用户提取接口不分期间、不写财务数据），代码不变 |
| P18 | MUST（工具类，默认 SHOULD） | 重新拆分脚本接受空裁定，跳过的文档也计入"verified"（`resplit-regulations.ts:121`、`:157`） | 已修（空裁定不算裁定；跳过的文档单独列出） |
| P19 | MUST | 超时测试的假 relay 无法产生重试等待，P14 的路径测不到（`b1-ai-entry.test.ts:111`） | 已修（随 P14 的测试） |
| P20 | MUST | `String(undefined)` 使"系统提示词非空"的断言对缺失也通过（`b1-ai-entry.test.ts:72`） | 已修 |
| P21 | MUST | 排除法规的 SQL 测试只有 `accounting_standard` 样例，删掉 `regulation` 的排除条件测试仍通过（`keyword-search.sql:11`） | 已修；在事务内换上去掉该条件的函数，测试失败，已证明非空转 |
| P22 | MUST | 上传后读取的测试用不按文档过滤的假库，测不出读错文档（`b4-search-citations.test.ts:44`）；staging 真实上传已通过 | 已修 |
| P23 | MUST | §citation-link 只测到事件数据，未测链接打开的是哪份原文（`b4-search-citations.test.ts:212`） | 已修（渲染链接并经预览接口打开） |
| P24 | MUST（工具类，默认 SHOULD） | 评测把"检索失败"标注也算作资料库外通过（`eval-retrieval.ts:109`）；两轮证据中的 8 个通过都是资料库外标注，不受影响 | 已修 |
| P25 | SHOULD | §vector-removed 只有注释，没有可执行的检查（Phase 6 才删向量） | 转入 Phase 6：删除向量后以 SQL 核对 |

**评审发现登记**（`/code-review` Phase 5，`main...feat/ai-provider` 全部改动；每条已对源码核实）：

| # | 级别 | 发现 | status |
|---|------|------|--------|
| V1 | MUST | 管理员上传法规时拆出 0 条也算成功（`no_articles` 不阻断）；文档检索又排除法规，这份法规两种检索都查不到（`upload-database-document/route.ts:520`） | 已修（`no_articles` 阻断上传） |
| V2 | MUST | 条款中间一行以"附表/附件/附录"开头（折行）就进入附录，之后所有条款静默丢弃，只记一条不阻断的异常（`regulation-splitter.ts:140`）；生产 45 部法规的异常清单只有 1 条且已裁定，现有数据不受影响 | 已修（只有句末之后的"附表/附件/附录"行才进入附录）；45 部法规重跑 `check`：1505 条、1 条异常，逐份条款内容与上次一致 |
| V3 | MUST | 管理员上传把 `policy` 也当法规拆分（`route.ts:205`），新上传的公司制度会以 R 编号的条款出现在法规检索中，重复编号还会阻断上传；脚本与文档检索只把 `regulation`、`accounting_standard` 当法规；生产现有 1 份制度 0 条款，不受影响 | 已修（`REGULATION_TYPES` 只在 `documents/constants.ts` 定义一处，路由与脚本共用） |
| V4 | MUST | "检索全部出错"把文档检索也算在内：法规检索出错、文档检索成功时，回答标"不是来自资料库"，而实际是检索失败（`finalize-answer.ts:23`）；代码与 REQ §5.5 字面一致，REQ 字面本身有歧义 | 已修（REQ §5.5、DESIGN §4 改为"法规检索全部出错"；按法规检索单独计数） |
| V5 | MUST | 出处检查把"第一条，加强应收账款催收"这类序号也当条款号整句删去，任何回答都会发生，不限于法规问题（`citations/index.ts:106`）；与 TD-034 同源 | 已缓解（`chat-system.md` v1.6：列举用"1. 2."）；TD-034 扩写为两种情形并升为高 |
| V6 | SHOULD | 检索参数校验失败（如关键词超过 10 字）既计入预算也计为出错，三次都这样会得到"检索暂时失败"的标注（`tool-executor.ts:53`） | 已修（注册表标出 `invalidInput`；计入预算，不计为出错） |
| V7 | SHOULD | 法规 PDF 被解析两次，第二次不在 try 中：第一次解析失败转 OCR 后，第二次仍抛错、返回 500（`route.ts:221`） | 已修（PDF 只解析一次，分页结果供拆分；按扫描件读取的法规 PDF 以明确原因失败） |
| V8 | SHOULD | 过程日志没跟上新的检索参数与节点：检索显示"正在执行 搜索文档..."不带关键词、完成时没有命中数，预算用尽也显示"完成"，`forceAnswer`、`finalizeAnswer` 显示为"处理中 (finalizeAnswer)..."（`format-event.ts:132`） | 已修 |
| V9 | NICE | 报告配置解析的回复不符合 schema 时，不再退回"没有理解您的意思"，而是 503（`parse-config/route.ts:71`） | 不改：REQ §ai-outcome 规定 schema 不符按失败处理 |
| V10 | NICE | 用户上传的 AI 失败路径用 `NextResponse.json`，不用 `createErrorResponse()`（`upload-temp/route.ts:461`）；`createErrorResponse` 在生产只返回通用文案，会盖掉 REQ §5.2 规定的失败提示 | 不改代码，已加注释写明原因 |

**Phase 4 证据**：

- §reg-integrity（45 部真实法规，2026-10-20）：`scripts/resplit-regulations.ts check` 第一轮 1196 条、18 条异常，其中 17 条是拆分规则的问题（康熙部首、2007 版准则无空格、字间距排版、浏览器页眉页脚），修正规则后 1505 条、1 条异常，已由 Jason 裁定（见裁定）。`apply` 后脚本逐条读回比对通过；SQL 独立核对：45 份文档均有条款，重复 0，条款内容中的章节标题 0、页码行 0、康熙部首 0。条款数与原文一致可核的：企业所得税法 60、关税法 72、增值税法 38、基本准则 50。替换前整表 1559 行备份于 `backup.structured_regulations_v4_6`，与原表逐行一致。B5 起草查询集时发现"⼜"被用来印"口"（关税法、保险合同共 40 条写成"出又""敞又"），修正映射后重新 `check`（条款数与异常清单不变）并 `apply`，核对通过。

- §retrieval-quality（审定的 20 条查询集，真实资料库，经 relay，`chat-system` v1.5）：第四轮资料库内 16/16、资料库外 4/4，P50 23s、P95 49.6s。第五轮资料库内 15/16、资料库外 4/4；未命中的 doc-6 是模型没有检索、直接反问年份。第五轮有 6 题撞上 60s 调用时限，按 Jason 裁定只补跑这 6 题（`eval-retrieval.ts <out-dir> <ids>`），补跑全部通过；其余 14 题为原跑结果。两轮前后会话、消息行数不变。此前三轮（11/16、两轮 relay 故障作废、6/16）的发现已转为裁定：文档检索排除法规准则、检索按问题性质分流、每文档最多 2 块。
- §6.2 报告耗时（`scripts/measure-report-latency.ts`，真实财务数据 2024 对 2023、全部 5 章，经 relay，5 次）：P50 94.1s、P95 124.2s；5 次都没有失败章节，摘要都已生成；前后 `reports` 行数不变。V4.6（官方 API）为 P50 56.8s、P95 71.3s（TD-024）。5 章与摘要是依次调用的 6 次 AI 调用。
- §6.2 对话耗时（检索评测第四、五轮，40 个完整问题）：P50 25.5s、P95 77.1s、最长 88s；超过 60s 的 4 个都是多次调用累加，每次都在时限内。第五轮原跑在 relay 慢时有 6 个问题撞上单次 60s 时限。
- staging（v4.7.0 `8688445`，`.env.staging` 已加 `LLM_API_KEY`、`LLM_BASE_URL`，改前备份 `.env.staging.bak-20261022023844`，值经哈希核对一致）：部署后冒烟通过，含一次真实报告生成（约 98s，无失败章节）。
- 未见过的真实输入（Claude 选题，经 staging 的对话接口，均不在查询集中）：① 生产设备由直线法改加速折旧，属政策变更还是估计变更 → 判为会计估计变更、未来适用法，引用 CAS4 第十四、十七、十九条与 CAS28 第九、十六条，5 条逐一对原文核对均支持所述内容，98s；② 增值税专用发票丢失怎么处理 → 开头标注"不是来自资料库"，无条款号，31s；③ 质保金按营收计提比例 → 引《财务管理制度》产品保修准备金（成熟产品 0.5–1.0%、新产品 1.5–2.0%），与原文一致，19s。
- 未见过的真实上传（Jason 同意，数据目录中的一份真实银行借款合同 PDF，经 staging 的 `upload-temp`）：上传 2s 成功，14 个切块、无 embedding；选中该文档提问金额、利率、期限、还款方式与提前还款 → 20s 作答，各项逐一对原文核对一致，含原文未填写的利率基点与未约定的借款人提前还款。上传与测试后 VPS 上的临时文件已删除。
- B6 之后的 staging 复演（`6467624`，含 B6 与 vite 7.3.7）：部署冒烟与 CI 均通过。上面三个未见过的问题重问一遍：① 判为会计估计变更，引用 CAS4 第十七、十九条与 CAS28 第九、十六条，4 条逐一对原文核对均支持，没有句子被删，102s（两轮法规检索）；② 标注"不是来自资料库"，无条款号，67s；③ 与《财务管理制度》原文一致，26s。借款合同（临时文档已过期，按同一用途重新上传）：14 个切块，29s 作答，与前一次结论一致；按"1.2 款"编号的条款没有被删。测试后 VPS 临时文件已删除。
- Phase 5 修复后的 staging 复演（`c2f3775`）：部署冒烟与 CI 通过。折旧方法问题的相邻出处显示为"《企业会计准则第4号——固定资产》第十九条、《企业会计准则第28号——会计政策会计估计变更和差错更正》第九条"；过程日志显示检索关键词、命中数与"核对出处"，44s。营运资金建议题列举用"1."与"第一，"，没有句子被删，24s。
- 延迟观察：同一查询集各轮 P50 从 20.7s 到 54s 不等，relay 慢时单次调用常撞 60s 时限，用户看到"AI 服务暂时不可用"；一个问题含多次调用，最长约 121s 才看到失败提示。

**Phase 6 boxes**：

- [ ] relay 用量上限已设（Jason）
- [ ] 生产 `.env` 加 `LLM_API_KEY`、`LLM_BASE_URL`（改前备份，值经哈希核对）；staging、生产两份 `.env` 删除不再使用的 `OPENAI_API_KEY`
- [ ] tag `v4.7.0` · [ ] 生产部署 + 核对 served SHA · [ ] 生产验证：冒烟、一个法规问题、一份报告
- [ ] 生产验证后删除向量列、向量函数、Edge Function `embed`、`backup` schema（REQ §5.8；不可逆，Jason 在 Dashboard 执行）
- [ ] §vector-removed：删除后以 SQL 核对 `embedding` 列与向量检索函数均已不存在（P25）
- [ ] CHANGELOG
- [ ] TECHNICAL_DEBT finalize：TD-021 改写为 relay 现状；TD-024 改写为本版测量值（P50 94.1s、P95 124.2s）与处理办法（章节并行调用，先测并行下 relay 的 529 率）；TD-031 处理版本裁定
- [ ] user docs（帮助页：出处、资料库外标注） · [ ] README 仍然属实，只指路不复述
- [ ] living-docs sweep（REQ / DESIGN / `ARCHITECTURE.md` 与上线版本一致）
- [ ] old-value sweep：`text-embedding-3-small`、`OPENAI_API_KEY`、embedding / 向量检索（`.claude/agents/db-migration.md` 等）
- [ ] announce · [ ] FEEDBACK sweep · [ ] roadmap 更新（`v4_DEVELOPMENT_PLAN.md` §3.11、§3.12）
- [ ] gate readout：每道门 runs / 改变了输出的 catches
- [ ] doc budgets green · [ ] memory prune
- [ ] acceptance trigger 登记
- [ ] **TRACK close（最后一项）**：未结事项转入 TECHNICAL_DEBT / FEEDBACK / REQ / DESIGN，然后 `git mv TRACK.md TRACK_v4.7.0.md`

## 四、Session-end pickup
