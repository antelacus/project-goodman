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
  - 外部约束（DESIGN 开写后迁入其外部约束一节；2026-10-19 用项目真实的提示词与工具定义、合成数据实测）：
    - relay 提供 9 个模型（`gpt-5.6-*`、`gpt-6*`、`gpt-6.1-sol` 等），没有 `gpt-4o` / `gpt-4o-mini` / `gpt-5-mini`，不支持 `/embeddings`
    - 请求不带系统提示词时，relay 注入约 4200 token 的 Codex 编程 agent 提示词（"OK" 计 4223 token，回复 "What would you like to work on?"）；带了系统提示词则不注入（同一句计 18 token，按我们的设定作答）
    - `max_tokens` 不生效（设 5，输出 33）；对话、JSON 模式、工具调用、流式输出均可用
    - Responses API 不带 `instructions` 时同样注入（计 4216 token）；视觉输入（`image_url`）、Responses API 的 PDF 文件输入、严格 `json_schema` 均可用，合成报表图片与扫描版 PDF 的数字识别正确
    - `gpt-6.1-sol` 每个报告章节约 9s；`gpt-6-luna`、`gpt-5.6-luna` 18–28s
    - 短输出（标题、报告配置解析）各测 3 次：`gpt-6-luna` 12–84s，`gpt-6.1-sol` 2–17s
    - 按 token 计费，各模型价格不同；用量上限需在 relay 侧自行设置
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

## 二、批次

Phase 2 切分。

## 三、门与发布

**评审发现登记**：Phase 2 起。

**Phase 4 证据**：Phase 4。

**Phase 6 boxes**：Phase 4 收尾时写入；已知必须包含：relay 用量上限已设（Jason）· VPS 上 staging、生产两份 `.env` 先后更新并备份，删除不再使用的 `OPENAI_API_KEY` · 生产验证后删除向量列、向量函数（REQ §5.8）· TD-021 改写为 relay 现状 · TD-024 重新测量

## 四、Session-end pickup
