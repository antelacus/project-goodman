# TRACK — release-pipeline（版本号在开工时分配）

## 一、范围与裁定

- 模式：standard · 目标：goodman 改用 antelacus 的分支模式与发布流水线，让部署底线四条由机器强制执行
- 范围：
  1. 公开就绪与公开：全部提交与 Actions 日志 / 产物的泄密审计；处理公开前须裁定的技术债（见 Phase 0 裁定；含 TD-032）；fork PR 的工作流须经批准；然后把仓库改为公开
  2. 分支：只留 `main` + `feat/*` / `hotfix/*`，删除 `development`；main 保护（必需检查、分支须同步、管理员同样受限、禁止强推与删除）
  3. 部署底线：CI 拦截部署；镜像在 CI 构建一次，经 SSH 送到 VPS，staging 与生产用同一镜像，VPS 不再构建；核对 served SHA；检查失败自动回滚；部署成功自动打 tag；构建后用 Trivy 扫描镜像（钉版本与 sha256 下载二进制，不用 trivy-action；做法同 antelacus `branch.yml` 的 `image` 任务），有修复版本的高危及以上漏洞拦截发布
  4. 密钥移出构建产物：`Dockerfile` 的构建参数只有 `NEXT_PUBLIC_*`，以 `docker build --check` 与镜像检查强制
  5. 漂移：开启 Dependabot 安全提醒（不开自动 PR）；CI 检查 `.nvmrc` 与镜像的 Node 版本一致、且未过 EOL
  6. 文档与工具：`docs/architecture/DECISIONS.md`（分支模式、无技术债政策、Dependabot 只开提醒、公开仓库）；文档预算检查与 post-merge 钩子；`DEPLOYMENT_CHECKLIST.md`、`CLAUDE.md` 的部署一节与新流程对齐；`docs/FEEDBACK.md`
- 明确不做：新功能；TD-026 命名重构；其余技术债按 Phase 0 裁定处理
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束（DESIGN 开写后迁入其外部约束一节）：私有仓库在 GitHub 免费档用不了分支保护与规则集（API 返回 403）；公开仓库的 Actions 标准 runner 不计分钟；不用镜像仓库（与 antelacus 相同，经 SSH 传输）
  - 现状（2026-10-19 核实）：staging 与生产连同一个 Supabase 项目（`pwqvou…`），持有同一把 service_role 密钥（只比对了哈希）；Redis 各自独立。每次 staging 冒烟的报告生成都在生产库写入一个会话和 2 条消息（10-12 三次部署 ↔ 三个会话，时间一一对应）。app 的数据访问多数经 anon 密钥（anon 对 `public` 的表有完整读写权限，RLS 策略为 `USING(true)` 或未开启；2026-10-20 核实，见 TD-032），少数经 service_role，所以 staging 上跑的任何分支代码都能读写生产数据。Supabase 免费档的 2 个项目额度已用满（antelacus、goodman）。staging 的数据隔离是 REQ / DESIGN 必须回答的问题
  - LLM：v4.7.0 起生产与 staging 都经第三方 relay（`LLM_BASE_URL`、`LLM_API_KEY`，见 `docs/features/ai-provider/DESIGN.md` §8）；relay 为预付费、无用量上限
  - 生产的 `docker-compose.yml` 在仓库外（`/home/deploy/goodman/`）、属 root，deploy 用户改不了；构建参数仍含 `SUPABASE_SERVICE_ROLE_KEY` 与已删掉值的 `OPENAI_API_KEY`（构建时只报变量未设的警告）。范围 3、4 接手构建后随之退役（2026-10-22 核实）
  - The Floor：审计只数命中、看前缀，不读出密钥的值；不用历史里的凭据去验证它是否有效
- 裁定：
  - 2026-10-29 · Trivy 镜像扫描放进本版：v4.7.2 时镜像仍在 VPS 上构建，CI 扫不到上线的那一份 · Jason · 级联：本 TRACK 范围 3
  - 2026-10-19 · goodman 改为公开仓库，作为分支保护的前提；公开在审计通过之后执行 · Jason · 级联：本 TRACK 范围 1、DESIGN（待开）
  - 2026-10-19 · 历史中 2025-07 的 service_role 密钥（`setup-storage.js`，项目 `moivfobm…`）属于已删除的 Supabase 项目、已失效，保留在历史中，不改写历史 · Jason · 级联：公开审计记录
  - 2026-10-19 · 远端旧分支（`maintenance/v4.6.4-*`、`claude/sharp-allen-*`）先逐个核对未合并提交、列给 Jason，再随 `development` 删除 · Jason · 级联：范围 2
  - 2026-10-19 · 技术债逐条裁定：TD-023、TD-029 公开前修；TD-027 新流水线中改为阻断；TD-025 删除（目标文件是历史快照）；TD-019 / 020 / 021 / 022 接受并附触发条件（TD-019 描述更正：OpenAI SDK 自带重试）；TD-021 的总花费兜底为公开前在服务商控制台设预算；TD-026 交 v4.8 Phase 0；TD-028 在 TD-027 删除后开 light 版本 · Jason · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-10-19 · 不放许可证：删除 AGPL-3.0（删 `LICENSE` 文件；`package.json` 改为 `UNLICENSED`；README 改为"保留所有权利"）；公开仅供查看 · Jason · 级联：`LICENSE`、`package.json`、`README.md`
  - 2026-10-19 · TD-024 需要优化，但不在本版 · Jason · 级联：`docs/TECHNICAL_DEBT.md`（v4.8 Phase 0 排期）
  - 2026-10-20 · TD-032（服务端以 anon 身份访问数据库、`users` 对 anon 开放）在本版修复，仓库公开之前完成 · Jason · 级联：`docs/TECHNICAL_DEBT.md`、本 TRACK 范围 1
  - 2026-10-22 · TD-021 的总花费兜底改为 relay 的预付余额（relay 不提供用量上限；推翻 10-19 的"在服务商控制台设预算"）；按 token 设限留到后续版本 · Jason · 级联：`docs/TECHNICAL_DEBT.md` TD-021
  - 2026-10-19 · 发布流水线顺延到 AI 服务切换（v4.7.0）之后：AI 不通，staging 检查无法验证；本 TRACK 的 Phase 0 工作与裁定保留，开工时重新执行 Phase 0 的核对 · Jason · 级联：`v4_DEVELOPMENT_PLAN.md` §3.11、§3.12

## 二、批次

（Phase 2 切分）

## 三、门与发布

**评审发现登记**：（Phase 2 起）

**Phase 4 证据**：（Phase 4）

## 四、Session-end pickup
