# TRACK — maintenance v4.8.1

## 一、范围与裁定

- 模式：maintenance · 目标：处理仓库公开后 Dependabot 首轮的 8 条安全告警，行为不变（v4.8.0 裁定 Q-I，`docs/features/public-readiness/TRACK_v4.8.0.md`）
- 范围：
  1. 开发依赖升级（不需裁定，已在分支上）：`@lhci/cli` 0.15 → 0.16.1（lighthouse 13 → puppeteer-core 25 → `@puppeteer/browsers` 3，依赖链里不再有 extract-zip，告警 2 条 high 消除）；`vitest`、`@vitest/coverage-v8` → 4.1.12（mocker 2 条）；`npm audit fix` 把 qs 升到 6.16.2（1 条）
  2. 升级迫使的代码改动：lhci 0.16 的报告文件名带随机后缀（`lhr-<时间>-<n>.json`），`scripts/quality-gates/lighthouse-gate.ts` 的文件名规则放宽为两种都认；不改则 Lighthouse 门报"找不到报告"而变红
  3. 审计允许清单 `tests/quality-baselines/audit/audit-allowlist.json` 清空：升级后 `npm audit` 已无 high / critical，14 条全部不再匹配任何公告（extract-zip 那几条的 fixPlan 写的正是"升级 @lhci/cli 去掉这条链"）
  4. 其余 3 条告警的处理（待裁定 R1–R3，见下）
- 明确不做：发布流水线的内容（分支保护、CI 拦截部署、镜像推广、构建参数中的旧密钥名）；允许清单对"不再匹配的条目"不报警的缺口（见 R4）
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - The Floor：本版不接触生产数据
  - 部署：本分支合并进 `development` 才部署 staging（`deploy-staging.yml` 要到下一次推送 `development` 才重新登记，推送后先核对它已登记、已运行）；合并 `main` 部署生产。两次合并都由 Jason 执行
- 剩余告警的事实（按代码与依赖核对）：
  - uuid（moderate，运行依赖）：漏洞只在 v3 / v5 / v6 带 `buf` 参数时触发。我们自己的代码用 uuid 13 的 `v4()`；告警来自 exceljs 4.4.0（已是最新版，依赖 `uuid ^8`，只调用 `v4()`）与 autocannon 8 → hyperid 3（开发依赖，性能门）。修法只有 override（exceljs 的 uuid 改为 11.1.1，仍支持 `require`）或 autocannon 升 9（大版本，hyperid 4 不再依赖 uuid）
  - katex（low，运行依赖）：漏洞需要先存在原型污染，且绕过的是 `trust` 选项；我们没有设置 `trust`。修复版本 0.18.2，但 `rehype-katex` 7.0.1（最新）与 `micromark-extension-math` 声明 `katex ^0.16.0`，只能 override 到它们声明的范围之外；0.18.0 改了 KaTeX 内部的 CSS 类名（我们没有针对它的样式，CSS 来自同一个包，版本一致）
  - minimatch（moderate，开发依赖）：来自 `eslint-config-next` → typescript-eslint 8（最新 8.72.2 仍声明 `minimatch ^10.2.2`），修复在 11.0.1，只能 override 到声明范围之外；它只匹配我们自己写的 lint 配置 glob
- 裁定：
  - 2026-11-12 · 本版为 maintenance v4.8.1，关版 v4.8.0 后单独处理 Dependabot 告警 · Jason（v4.8.0 Q-I，初判 b，终裁 a） · 级联：`docs/versions/v4/v4_DEVELOPMENT_PLAN.md`
  - R1 uuid：(a) override 修复 (b) 在 Dependabot 驳回为"漏洞代码未被使用"并写明理由 —— 待 Jason 初判
  - R2 katex：(a) override 到 0.18，staging 上核对公式渲染 (b) 驳回为"漏洞代码未被使用" —— 待 Jason 初判
  - R3 minimatch：(a) override 到 11 (b) 驳回为"风险可容忍" —— 待 Jason 初判
  - R4 允许清单缺口：审计门对不再匹配的条目不报警，14 条过期条目一直显示为"通过" —— 本版修（门对不匹配的条目报失败）还是登记技术债 —— 待 Jason 初判

## 三、门与发布

**评审发现登记**：本版不触发 Codex（没有新写的输出相关代码）；diff 不触及 `src/`，不跑 `/code-review`。

**Phase 4 证据**：
- 本地（`maintenance/v4.8.1`）：`tsc` 通过；全量 82 个文件、398 个测试通过（含覆盖率模式）；lint 16 条警告（基线）；审计门通过（允许清单为空）
- Lighthouse 门按 CI 的方式在本机运行（dev server、placeholder 环境变量、Playwright 的 Chromium）：升级后未改规则时红（找不到报告），放宽文件名规则后绿；判定读到了两份新报告（lighthouse 13.6.0）：`/` 性能 1.00、可访问性 0.93，`/chat` 性能 1.00、可访问性 0.96；基线（lighthouse 11.4.0）两页可访问性均为 0.94

**Phase 6 boxes**：
- [ ] CHANGELOG 条目
- [ ] TECHNICAL_DEBT 定稿
- [ ] 旧值清扫（`@lhci/cli` 0.15、`vitest` 4.0 等版本号在文档中的残留）
- [ ] staging 演练 + 冒烟 + 一条业务路径端到端（含回答中的公式渲染，若 R2 选 a）
- [ ] tag `v4.8.1`
- [ ] 生产部署 + 核对服务的 SHA
- [ ] Dependabot 告警复查：已修的自动关闭，驳回的写明理由
- [ ] 各门读数
- [ ] **关版（最后一项）**：未了事项归位 → `git mv TRACK.md TRACK_v4.8.1.md`
