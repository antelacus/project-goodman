# TRACK — maintenance v4.7.3

## 一、范围与裁定

- 模式：maintenance · 目标：关掉 zod 3 的内存耗尽公告（TD-035），允许项 2026-11-15 到期前上线，用户可见行为不变
- 范围：
  0. 报告接口限流（见裁定）
  1. `zod` ^3.22.4 → ^4.6.7；`openai` ^5.6.0 → 7.x（5.x 只接受 zod 3；7.45.1 的 peer 为 `zod ^3.25 || ^4.0`）；`@langchain/core`、`@langchain/langgraph` 仅在锁定版本不兼容 zod 4 时升级
  2. 升级强制的代码改动（输出相关，按 §2 分级，上线前 Codex 审查）：
     - `src/lib/tools/registry.ts` 的 `zodSchemaToOpenAI` 读 zod 3 内部的 `_def.typeName`；zod 4 没有这个字段，判断落空后返回空参数 schema，智能体的每个工具在模型眼里都没有参数，运行时不报错（调用方 `agent-loop.ts:97`；`tests/unit/tools/registry.test.ts` 断言了参数，会变红）。改用 zod 4 自带的 `z.toJSONSchema()`，删掉手写转换
     - `z.record(值)` 单参数写法（`src/lib/tools/types.ts:186`）在 zod 4 须写明键
     - `.uuid()` 在 zod 4 按 RFC 9562 校验版本位；`gen_random_uuid()` 与 `uuid` v4 不受影响，测试里的假 UUID 可能被拒
     - `src/lib/ai/index.ts` 的 `openai/helpers/zod`（`zodResponseFormat` / `zodTextFormat`）随 SDK 升级核对
  3. audit 允许清单：删除 `openai`；`chromium-bidi` 自带 zod 3（puppeteer-core 24.x 钉在 chromium-bidi 14），`zod` 与 `chromium-bidi` 两条改为只覆盖这条仅开发用的链，并入 `@lhci/cli` 链的条目（2026-12-19 到期）
- 明确不做：给 `api-schemas.ts` 的数组加长度上限（升级本身修复公告）；发布流水线 TRACK 范围内的技术债（TD-023 / 027 / 029 / 031 / 032）
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 本版不含数据库迁移
  - LLM 经第三方 relay（`docs/features/ai-provider/DESIGN.md` §8）；openai 7 的请求须在 staging 上经 relay 实测
  - staging 冒烟会在生产库写入一个会话和 2 条消息（`docs/features/release-pipeline/TRACK.md` 外部约束），本版不改变这一点
- Phase 0 核实：
  - TD-036：报告相关路由（`generate`、`save`、`parse-config`、`[id]`、`[id]/docx`、列表）都先调用 `ensureSession`；没有会话时建访客会话，访客能用是产品设计，不是绕过身份验证。perf-test 旁路在 `NODE_ENV=production` 下关闭。不走 hotfix
  - 同时发现：`/api/reports/*` 不在 `rate-limiter.ts` 的 `ai` 档（每 IP 每分钟 20 次），按 `default` 每分钟 100 次；`parse-config` 每次调用 AI，没有访客次数限制。TD-021 写的"AI 接口按 IP 每分钟 20 次"对这两个路由不成立
  - FEEDBACK Inbox 为空
- 裁定：
  - 2026-10-29 · TD-036 删除（非漏洞，见上）；TD-021 描述更正为实际覆盖范围 · Jason · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-10-29 · 调用 AI 的报告接口（`generate`、`parse-config`）在本版并入 `ai` 档；查看报告的接口仍按 `default` · Jason · 级联：`src/lib/security/rate-limiter.ts`、TD-021
  - 2026-10-29 · openai 升到 7.x，不停在 6.x：两者都跨大版本，SDK 只在 `src/lib/ai/` 使用 · Jason · 级联：本 TRACK 范围 1
  - 2026-10-29 · `/code-review` 九项按 Claude 建议处置；修复放进收尾 PR（`maintenance/v4.7.3-close`），合并前先过 staging；`upload-temp` 并入 `ai` 档（与报告接口同理） · Jason · 级联：本 TRACK 评审登记、`rate-limiter.ts`、`src/lib/ai/index.ts`、`src/lib/tools/`、TD-021、CHANGELOG
  - 2026-10-29 · 工具参数改由 `z.toJSONSchema()` 生成（方案 A），不移植旧转换（方案 B）：27 个工具的字段名、类型、必填与旧输出一致，新增模型原先看不到的约束（`extract_document` 的枚举、检索关键词的个数与长度、`evaluate_expression.variables` 的值类型）。模型输入因此改变，不算"行为不变"；不新增模块、不改契约，留在 maintenance，由 staging 的工具提问与 Codex 审查验证。不选 B：B 仍读 zod 私有内部字段（本次正是它失效），且继续向模型隐藏约束 · Jason · 级联：`src/lib/tools/registry.ts`、`.claude/rules/code-conventions.md`（删去 `_def` 的 any 理由）

## 三、门与发布

**评审发现登记**：
- Codex 上线前审查（`registry.ts`、`src/lib/ai/index.ts`，xhigh，只读，`9211b4c`）：无 MUST / SHOULD / NICE。待核两项：① relay 是否接受联合类型数组（`type: ["number","string"]`）与 `propertyNames`——每次带工具的对话都会发送全部工具定义，staging 上一次智能体提问即可核实；② 未对照 openai 5.6.0 源码（本地已无）
  - status: ① 已关闭——staging 智能体提问中 relay 接受全部工具定义，模型按新 schema 以数值对象传入 `evaluate_expression.variables`；② 不另行处理，SDK 7 的行为由 fake relay 验收测试覆盖
- `/code-review`（PR #10，high；结果在合并后返回）。严重性为 Claude 建议、待 Jason 裁定；每条已对照源码核实：
  1. SHOULD · `registry.ts:169` 遇到无法表示的 schema（`z.date()`、`transform` 等）会抛错，每次对话都失败；现有工具不触发，也没有测试把真实注册的工具全部转换一遍 · status: 已修——`registry.test.ts` 把真实注册的全部工具转换一遍（加 `z.date()` 字段时变红）；不加兜底，兜底即回到静默降级
  2. SHOULD · `ai/index.ts:216` 工具调用缺 `type` 字段时整轮失败；本 relay 实测带 `type`，属假设性兼容 · status: 已修——只拒 `type === 'custom'`；`b1-ai-entry` 新增缺 `type` 的函数调用照常通过（修前变红）
  3. SHOULD · `/api/documents/upload-temp` 调 AI 做 OCR，仍在 `data` 档（每分钟 60 次）；本版写进 TD-021 的 AI 接口清单因此不完整 · status: 已修——`upload-temp` 并入 `ai` 档（`rate-limiter.test.ts`，修前变红）；TD-021 改为"访客可调用的 AI 接口"并列入文档上传
  4. NICE · 报告接口并入 `ai` 档后与对话共用每 IP 每分钟 20 次；同一出口 IP 的多人办公会互相挤占 · status: 已写入 TD-021，随其触发条件重议
  5. NICE · zod 4 的默认校验消息措辞变化并直接返回给调用方；zod 3 的默认消息同为英文，只是措辞不同，界面发出的请求不触发 · status: 不处理
  6. NICE · zod 4 的 `.uuid()` 校验版本位；仓库内 ID 均由 `gen_random_uuid()` / uuid v4 生成，迁移与代码中无写死的 UUID（仅数据库独有的旧迁移未核，见 TD-031） · status: 不处理
  7. SHOULD · `src/lib/tools/search/keywords.ts` 注释"发给模型的 schema 带不了这些限制"已不成立 · status: 已修——删去该句
  8. NICE · 每轮重新生成全部工具 schema；实测 27 个工具每次 0.42 ms · status: 不处理
  9. NICE · `parameterOverrides` / `OpenAIParameterSchema` 已无生产调用方（仅测试） · status: 已修——删除，测试改为只验证 detailed 描述

**Phase 4 证据**：
- 本地（`9211b4c`）：vitest 70 个文件、318 个测试全过；`tsc` 通过；lint 0 错误、16 条警告（与 v4.7.2 相同）；`npm run test:audit` 通过
- 变异检查：去掉 `$schema` 删除、或把 `io` 改为 `output`，`registry.test.ts` 各变红一例
- staging（`0c3a091`，`development` 快进）：Deploy Staging 40813140750 与 CI 40813140781 均通过；健康检查报 4.7.3，冒烟含一次真实报告生成（经 relay）
- staging 智能体提问（访客会话，"2024 年资产负债率及较 2023 年变化"）：两轮共 3 次工具调用（`debt_to_asset_ratio` ×2、`evaluate_expression`），无失败事件，回答完成。同时发现过程日志重复显示前几轮的工具结果，登记为 TD-037（本版未改动相关代码）

**Phase 6 boxes**：
- [x] CHANGELOG 条目
- [x] TECHNICAL_DEBT 定稿：删除 TD-035；新增 TD-037（下一个版本 Phase 0 裁定）
- [x] 旧值扫尾：`zod ^3`、`openai ^5` 在 CHANGELOG 与冻结文档之外无出处；仅 audit 允许清单两条有意说明嵌套的 zod 3
- [x] staging：部署冒烟 + 一次用到智能体工具的真实提问（核对工具参数到达模型）
- [x] 生产部署 + 核对 served 版本：Deploy 40814045286（`afc816d`）通过；`/api/health` 报 4.7.3；VPS 构建目录在 `afc816d`；容器内 Node v26.13.0
- [x] tag `v4.7.3`（附注 tag，指向 `afc816d`）
- [x] 各门读数（运行 / 改变了输出的拦截）：`tsc` 3 / 1（openai 7 的 custom 工具调用 → 新增守卫）；vitest 全量 4 / 1（`registry.test.ts` 抓到工具参数为空 → 方案 A）；本地 `test:audit` 2 / 1（嵌套 zod 3 仍被标出 → 允许项改范围）；Codex 上线前 1 / 0；staging 冒烟 1 / 0；staging 智能体提问 1 / 0（关闭 Codex 待核 ①）；CI `quality` 1 / 0；生产 Deploy 1 / 0；`/code-review` 1 / 2（#2 缺 `type` 的工具调用、#3 `upload-temp` 限流）
- [ ] 收尾 PR（评审修复）：staging 冒烟 → 合并 → 生产部署 + 核对 served 版本
- [ ] **关版（最后一项）**：未了事项归位 → `git mv TRACK.md TRACK_v4.7.3.md`
