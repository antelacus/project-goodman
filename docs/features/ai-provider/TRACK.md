# TRACK — ai-provider v4.7.0

## 一、范围与裁定

- 模式：standard · 目标：AI 服务恢复可用并换到第三方 relay 与新模型；去掉 embedding；AI 调用失败时用户看到的是失败，而不是编造的分析
- 范围：
  1. relay 切换：`LLM_BASE_URL` / `LLM_API_KEY` 指向 relay；对话与报告用 `gpt-6.1-sol`，其余场景（标题、信息提取）按 OpenAI 官方模型的特性选型；调用参数按官方模型的要求写（官方的新模型不接受 `max_tokens`，要用 `max_completion_tokens`）
  2. 每次 AI 调用都带系统提示词，由测试守住
  3. AI 调用失败时不再编造：报告章节明确显示失败，摘要不以兜底文字冒充结论；冒烟测试检查报告里没有失败的章节
  4. 去掉 embedding：改为关键词加 agentic 检索，中文检索要能分词；以测试查询集证明检索质量不低于现状；移除上传时的向量化、Supabase Edge Function `embed`，数据库的向量列与函数先扩后缩
  5. 上传与文档检索恢复可用
  6. VPS 上的 `.env` 在部署时更新，先 staging、后生产；值不经过对话
- 明确不做：发布流水线（顺延，见 `docs/features/release-pipeline/TRACK.md`）；TD-024 的报告耗时优化（本版只在 Phase 4 重新测量）；其他新功能
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束（DESIGN 开写后迁入其外部约束一节；2026-10-19 用项目真实的提示词与工具定义、合成数据实测）：
    - relay 提供 9 个模型（`gpt-5.6-*`、`gpt-6*`、`gpt-6.1-sol` 等），没有 `gpt-4o` / `gpt-4o-mini` / `gpt-5-mini`，不支持 `/embeddings`
    - 请求不带系统提示词时，relay 注入约 4200 token 的 Codex 编程 agent 提示词（"OK" 计 4223 token，回复 "What would you like to work on?"）；带了系统提示词则不注入（同一句计 18 token，按我们的设定作答）
    - `max_tokens` 不生效（设 5，输出 33）；对话、JSON 模式、工具调用、流式输出均可用
    - `gpt-6.1-sol` 每个报告章节约 9s；`gpt-6-luna`、`gpt-5.6-luna` 18–28s
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

## 二、批次

Phase 2 切分。

## 三、门与发布

**评审发现登记**：Phase 2 起。

**Phase 4 证据**：Phase 4。

**Phase 6 boxes**：Phase 4 收尾时写入；已知必须包含：relay 用量上限已设（Jason）· TD-021 改写为 relay 现状 · TD-024 重新测量

## 四、Session-end pickup
