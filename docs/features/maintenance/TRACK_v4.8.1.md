# TRACK — maintenance v4.8.1

## 一、范围与裁定

- 模式：maintenance · 目标：处理仓库公开后 Dependabot 首轮的 8 条安全告警，行为不变（v4.8.0 裁定 Q-I，`docs/features/public-readiness/TRACK_v4.8.0.md`）
- 范围：
  1. 开发依赖升级（不需裁定，已在分支上）：`@lhci/cli` 0.15 → 0.16.1（lighthouse 13 → puppeteer-core 25 → `@puppeteer/browsers` 3，依赖链里不再有 extract-zip，告警 2 条 high 消除）；`vitest`、`@vitest/coverage-v8` → 4.1.12（mocker 2 条）；`npm audit fix` 把 qs 升到 6.16.2（1 条）
  2. 升级迫使的代码改动：lhci 0.16 的报告文件名带随机后缀（`lhr-<时间>-<n>.json`），`scripts/quality-gates/lighthouse-gate.ts` 的文件名规则放宽为两种都认；不改则 Lighthouse 门报"找不到报告"而变红
  3. 审计允许清单 `tests/quality-baselines/audit/audit-allowlist.json` 清空：升级后 `npm audit` 已无 high / critical，14 条全部不再匹配任何公告（extract-zip 那几条的 fixPlan 写的正是"升级 @lhci/cli 去掉这条链"）
  4. 其余 3 条告警按 R1–R3 处理：uuid、minimatch 用 `overrides` 修复（autocannon 那条链随 R5 删除性能门一起消失）；katex 在 Dependabot 驳回，理由与触发条件见 `docs/TECHNICAL_DEBT.md` TD-047；`overrides` 的撤除条件见 TD-046。`tmp` 的旧 override 删除（exceljs 声明的 `^0.2.0` 已包含修复版本，锁文件不变）
  5. 审计门对不匹配任何告警的允许清单条目报失败（R4，`[infra]` 提交，范围只限判定逻辑、门的输出与测试）
  6. 删除性能门（R5）：门、判定逻辑、测试、基线、CI 步骤、`autocannon` 依赖，以及 4 个 API 路由里只在 `PERF_TEST_MODE` 下生效的旁路（生产中 `NODE_ENV=production`，旁路从未执行）
  7. 用 lighthouse 13 重新生成 Lighthouse 基线（R6），已知的可访问性不及格项登记为 TD-048
- 明确不做：发布流水线的内容（分支保护、CI 拦截部署、镜像推广、构建参数中的旧密钥名）
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
  - R1 uuid：(a) override 修复 (b) 在 Dependabot 驳回为"漏洞代码未被使用"并写明理由 · Jason（初判 a，终裁 a）
  - R2 katex：(a) override 到 0.18，staging 上核对公式渲染 (b) 驳回 · Jason（初判 b，终裁 b）· 驳回理由由"漏洞代码未被使用"改为"需要页面先存在原型污染"：katex 的输入是模型回答，可被用户消息与上传文档左右
  - R3 minimatch：(a) override 到 11 (b) 驳回为"风险可容忍" · Jason（初判 b，终裁 a）· 改判依据：a 的验证完整且免费（override 出问题 lint 当场红），只影响开发依赖；而 R1 的 a 触及运行时路径
  - R4 允许清单缺口：审计门只对被告警匹配到的条目检查到期日，不匹配任何告警的条目既不报警也不会过期，14 条一直显示为"通过" —— (a) 本版修，门对不匹配的条目报失败 (b) 登记技术债 · Jason（初判 a，终裁 a）· 以 `[infra]` 提交；到期日机制保留（两者拦的是不同的问题）
  - R5 性能门的延迟检查从未生效（`/code-review` 发现 1）：autocannon 不产出 `p95`（只有 p50/p75/p90/p97_5/p99），`perf-gate.ts` 读 `latency.p95 ?? 0`，基线 4 个场景 p95 都是 0，比较恒为 0 > 0，延迟退化永远不报；门实际只比较失败率。基线 2026-01-20 在开发机（`localhost:3003`）生成，CI 在 GitHub runner 上比较，即使改读 p99，比较的也是两台不同的机器。`docs/OBSERVABILITY.md` 写的"P95 或失败率退化 > 20% 触发失败"不成立 —— (a) 本版修 (b) 删掉延迟比较、只留失败率 (c) 登记技术债、先改文档 (d) 整个删掉性能门 · Jason（初判 a，终裁 d）· 改判依据：性能请求在路由入口就返回固定结果，不经过模型、数据库与检索，测的是 `next dev` 上 5 个请求的路由开销；修好延迟比较也测不到用户感受到的延迟（TD-024 的瓶颈在模型调用），共享 runner 上 5 个样本的最大值会随机失败；失败率检查在固定返回值上只证明路由能返回 200，build 与 E2E 已覆盖；删掉门也删掉了生产路由里的旁路
  - R6 Lighthouse 基线跨版本比较（`/code-review` 发现 4）：基线由 lighthouse 11.4.0 生成，现在用 13.6.0 运行，评分模型变了，`/` 可访问性 0.94 → 0.93 没有代码改动；基线同样在开发机生成 —— (a) 用 lighthouse 13 重新生成 (b) 保留并登记技术债 · Jason（初判 a，终裁 a 的折中：重新生成，已知缺陷登记技术债，本版不改界面）· 折中依据：新旧报告的不及格项对比显示 `/` 的下降来自 `landmark-one-main`——lighthouse 11 中它不计分，13 起计分，首页确实没有 `<main>`；直接重新生成会把这个真实缺陷当成正常，登记 TD-048 让它不被遗忘

## 三、门与发布

**评审发现登记**：本版不触发 Codex（没有新写的输出相关代码）。diff 触及 `src/lib/quality-gates/`（R4），开 PR 前跑了一次 `/code-review`（medium，`3c5cd9d`），8 条，逐条对源码核实：
1. SHOULD · 性能门的 p95 恒为 0，延迟检查从未生效 · 核实成立（早于本版）· status: 已处理（R5 = d，门已删除）
2. SHOULD · 审计门对不匹配条目报失败，依赖实时公告库，公告撤回或改级会让无关 PR 变红 · 核实成立，已在 R4 反驳中提出，Jason 终裁 a · status: 接受
3. SHOULD · 允许清单同一键的第二条不进索引，却被算作"已匹配"，R4 的检查漏掉它 · 核实成立 · status: 已修（解析时报重复，单元测试先红后绿）
4. SHOULD · Lighthouse 基线是 lighthouse 11，跨评分模型比较 · 核实成立 · status: 已处理（R6，基线已重新生成，TD-048）
5. NICE · 文件名规则与 `@lhci/utils` 的重复 · status: 不改（那是 lhci 的内部文件，引用它耦合更深；两者规则相同；注释改为指向 lhci 的规则）
6. NICE · 既过期又不匹配的条目只出现在"不匹配"列表 · status: 不改（两种情况的处理都是删掉或更新条目）
7. NICE · 门的通过行不提低、中危数量（katex 4 条 low）· status: 不改（门只判 high / critical；Phase 6 读数直接引 `npm audit`）
8. NICE · exceljs 的 uuid 用 `^11.1.1` 而非精确版本，没有自动测试覆盖 · status: 不改（11.x 内为同一大版本；uuid 在 exceljs 加载时即被 `require`，导入失败会让解析 Excel 的测试红）

**Phase 4 证据**：
- 本地（`maintenance/v4.8.1`）：`tsc` 通过；全量 82 个文件、398 个测试通过（含覆盖率模式）；lint 16 条警告（基线）；审计门通过（允许清单为空）
- R1 / R3 之后：`npm audit` 只剩 katex 4 条 low（同一公告的依赖链）；exceljs 带 uuid 11.1.1 写入并读回带数据条条件格式的工作簿（走到它唯一调用 `v4()` 的文件）；lint 16 条警告不变；`tsc` 通过；全量 82 个文件、399 个测试通过（含覆盖率模式）
- 性能门（autocannon 9）按 CI 的方式在本机运行：4 个场景通过；门在零请求时报错，通过即说明拿到了响应、失败率未退化——不说明延迟（见 R5，门随后删除）
- R5 / R6 之后：`tsc` 通过；lint 16 条警告；全量 80 个文件、392 个测试通过（含覆盖率模式；删掉的是性能门的 2 个测试文件）；`next build` 通过；`npm audit` 只剩 katex
- Lighthouse 新基线（lighthouse 13.6.0）：`/` 性能 1.00、可访问性 0.93（不及格：`color-contrast`、`landmark-one-main`），`/chat` 性能 1.00、可访问性 0.96（不及格：`color-contrast`）；按 CI 的方式对新基线跑门：通过；新报告中无本机路径、账号或真实密钥
- R4 非空转证明：用升级前那份 14 条的允许清单跑真实的门——新门红并列出全部 14 条，旧门在同一输入上绿；当前空清单上新门绿（`blocked 0 / allowlisted 0 (allowlist entries: 0)`）
- Lighthouse 门按 CI 的方式在本机运行（dev server、placeholder 环境变量、Playwright 的 Chromium）：升级后未改规则时红（找不到报告），放宽文件名规则后绿；判定读到了两份新报告（lighthouse 13.6.0）：`/` 性能 1.00、可访问性 0.93，`/chat` 性能 1.00、可访问性 0.96；基线（lighthouse 11.4.0）两页可访问性均为 0.94

**合并前 CI**：`ci.yml` 只在推送 `development` 与向 `main` 开 PR 时运行，PR #17（→ `development`）本身不跑 CI；为在合并前验证本版改过的 CI，开草稿 PR #18（→ `main`，仅触发 CI，已关闭）：run 43155593122 全部步骤通过——Lighthouse 门对新基线通过、审计门 `blocked 0 / allowlisted 0 (allowlist entries: 0)`、80 个测试文件、build

**Teach-back**（PR #17 合并前，Jason 不看材料复述）：① 删掉性能门为何生产行为不变——"被删的 4 段路由代码只在非生产环境生效"；补充：执行需三个条件同时成立（`PERF_TEST_MODE=true`、`NODE_ENV` 非 `production`、带性能测试请求头），生产镜像与 compose 写死 `NODE_ENV=production`，其一即足够 ② R4 新拦下什么——"不匹配任何告警的条目；原机制只对被匹配到的条目检查到期日"；补问后果，答"有漏洞的版本再次出现时永远不会被发现"；纠正"永远"：版本回来后条目重新匹配、到期日检查恢复，门放行到该条目到期为止，期间 Dependabot 仍会报警。判定通过

**提交历史**：`49f2efe` 单独检出不能编译（删了 `perf-test.ts`，路由的改动在 `2b49409`）；重排后的提交被权限拦截强推，Jason 选择保留远端现状（最终树相同）。二分查找时跳过它

**Phase 6 boxes**：
- [x] CHANGELOG 条目（日期按实际 tag 日核对）
- [x] TECHNICAL_DEBT 定稿（TD-046 overrides、TD-047 katex）
- [x] 旧值清扫（`@lhci/cli` 0.15、lighthouse 11、`vitest` 4.0、autocannon 8、uuid ^8、minimatch ^10、katex 0.16 在活文档中无残留；冻结的历史文档不改）
- [x] staging 演练 + 冒烟 + 一条业务路径端到端：PR #17 合并（`4882c53`）后 `deploy-staging.yml` 重新登记并运行，CI 与部署均通过；健康接口报 `4.8.1`、提交 `4882c53`（部署脚本自比对）；冒烟（健康、管理员登录、会话、报告生成）通过。业务路径（经 SSH 隧道）：访客上传合成利润表（xlsx，含数据条条件格式）——exceljs（uuid 11.1.1）解析 77 ms、166 字、1 块、存入 Storage；问净利润增长：回答增加额 55,762.50、增长率 38.25%（手算 55,762.50 ÷ 145,800 = 0.38246），表格与公式正常渲染，注明原表未标单位。日志中 `next/image` 缓存写入失败为既有问题（生产同样配置，本版未改 `Dockerfile`）→ TD-049
- [x] tag `v4.8.1`（附注 tag，指向 `1c007aa`）
- [x] 生产部署 + 核对服务的 SHA：PR #19 合并（`1c007aa`），CI（PR 上）与 Deploy 均通过；公网健康接口报 `4.8.1`、提交 `1c007aa`，数据库与 Redis ok
- [x] Dependabot 告警复查：#1–3、#5、#6、#9、#10 在合并 `main` 时自动关闭为 fixed；#4 katex 为 dismissed（tolerable_risk，注明 TD-047）；未处理 0
- [x] 各门读数（运行次数 / 改变了输出的拦截）：
  - Lighthouse 门：本机 4、CI 3 / 1（lhci 0.16 改了报告文件名，门报"找不到报告"变红 → 放宽文件名规则）
  - 审计门：本机 6、CI 3 / 0（新规则的非空转证明是有意构造的旧清单，不计为拦截）
  - `/code-review`：1 / 3（发现 3 → 修复重复键；发现 1 → R5 删除性能门；发现 4 → R6 重新生成基线）
  - 类型检查、lint、单元测试（含 pre-commit 钩子）：本机多次、CI 3 / 0
  - A11y 门：CI 3 / 0
  - staging 冒烟 + 业务路径：1 / 0（看到的图片缓存问题早于本版，登记 TD-049，未改输出）
  - 部署后核对服务的 SHA：staging 1、生产 1 / 0
  - 性能门：本机 1 / 0，本版删除（R5）
  - Codex：本版不触发
- [x] **关版（最后一项）**：未了事项归位（overrides 的撤除条件 → TD-046；katex → TD-047；Lighthouse 基线中的已知不及格项 → TD-048；图片缓存 → TD-049；`ci.yml` 不跑进 `development` 的 PR、`deploy-staging.yml` 已登记 → `docs/features/release-pipeline/TRACK.md` 现状；版本状态 → `v4_DEVELOPMENT_PLAN.md`）→ `git mv TRACK.md TRACK_v4.8.1.md`
