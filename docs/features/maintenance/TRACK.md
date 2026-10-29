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
  - 2026-10-29 · 工具参数改由 `z.toJSONSchema()` 生成（方案 A），不移植旧转换（方案 B）：27 个工具的字段名、类型、必填与旧输出一致，新增模型原先看不到的约束（`extract_document` 的枚举、检索关键词的个数与长度、`evaluate_expression.variables` 的值类型）。模型输入因此改变，不算"行为不变"；不新增模块、不改契约，留在 maintenance，由 staging 的工具提问与 Codex 审查验证。不选 B：B 仍读 zod 私有内部字段（本次正是它失效），且继续向模型隐藏约束 · Jason · 级联：`src/lib/tools/registry.ts`、`.claude/rules/code-conventions.md`（删去 `_def` 的 any 理由）

## 三、门与发布

**评审发现登记**：
- Codex 上线前审查（`registry.ts`、`src/lib/ai/index.ts`，xhigh，只读，`9211b4c`）：无 MUST / SHOULD / NICE。待核两项：① relay 是否接受联合类型数组（`type: ["number","string"]`）与 `propertyNames`——每次带工具的对话都会发送全部工具定义，staging 上一次智能体提问即可核实；② 未对照 openai 5.6.0 源码（本地已无）
  - status: 待核 ① 由 staging 智能体提问关闭；② 不另行处理，SDK 7 的行为由 fake relay 验收测试覆盖
- `/code-review`（版本 PR）：未开始

**Phase 4 证据**：
- 本地（`9211b4c`）：vitest 70 个文件、318 个测试全过；`tsc` 通过；lint 0 错误、16 条警告（与 v4.7.2 相同）；`npm run test:audit` 通过
- 变异检查：去掉 `$schema` 删除、或把 `io` 改为 `output`，`registry.test.ts` 各变红一例

**Phase 6 boxes**：
- [ ] CHANGELOG 条目
- [ ] TECHNICAL_DEBT 定稿：删除 TD-035
- [ ] 旧值扫尾：`zod ^3`、`openai ^5`
- [ ] staging：部署冒烟 + 一次用到智能体工具的真实提问（核对工具参数到达模型）
- [ ] 生产部署 + 核对 served 版本
- [ ] tag `v4.7.3`
- [ ] 各门读数（运行 / 改变了输出的拦截）
- [ ] **关版（最后一项）**：未了事项归位 → `git mv TRACK.md TRACK_v4.7.3.md`
