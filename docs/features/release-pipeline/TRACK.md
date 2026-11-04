# TRACK — release-pipeline（版本号在开工时分配）

## 一、范围与裁定

- 模式：standard · 目标：goodman 改用 antelacus 的分支模式与发布流水线，让部署底线四条由机器强制执行
- 范围：
  1. 前提：仓库已公开——泄密审计、公开前须修的技术债（含 TD-032）与公开本身已拆到公开就绪版本（`v4_DEVELOPMENT_PLAN.md` §3.13），本版开工时它须已完成
  2. 分支：只留 `main` + `feat/*` / `hotfix/*`，删除 `development`；main 保护（必需检查、分支须同步、管理员同样受限、禁止强推与删除）
  3. 部署底线：CI 拦截部署；镜像在 CI 构建一次，经 SSH 送到 VPS，staging 与生产用同一镜像，VPS 不再构建；核对 served SHA；检查失败自动回滚；部署成功自动打 tag；构建后用 Trivy 扫描镜像（钉版本与 sha256 下载二进制，不用 trivy-action；做法同 antelacus `branch.yml` 的 `image` 任务），有修复版本的高危及以上漏洞拦截发布
  4. 密钥移出构建产物：`Dockerfile` 的构建参数只有 `NEXT_PUBLIC_*`，以 `docker build --check` 与镜像检查强制
  5. 漂移：开启 Dependabot 安全提醒（不开自动 PR）；CI 检查 `.nvmrc` 与镜像的 Node 版本一致、且未过 EOL
  6. 文档与工具：`docs/architecture/DECISIONS.md`（分支模式、无技术债政策、Dependabot 只开提醒、公开仓库）；文档预算检查与 post-merge 钩子；`DEPLOYMENT_CHECKLIST.md`、`CLAUDE.md` 的部署一节与新流程对齐；`docs/FEEDBACK.md`
- 明确不做：新功能；TD-026 命名重构；其余技术债按 Phase 0 裁定处理
- 全局约束：
  - 版本地板：Node → `.nvmrc`；依赖 → `package.json`
  - 外部约束（DESIGN 开写后迁入其外部约束一节）：私有仓库在 GitHub 免费档用不了分支保护与规则集（API 返回 403）；公开仓库的 Actions 标准 runner 不计分钟；不用镜像仓库（与 antelacus 相同，经 SSH 传输）
  - 现状（2026-10-19 核实）：staging 与生产连同一个 Supabase 项目（`pwqvou…`），持有同一把 service_role 密钥（只比对了哈希）；Redis 各自独立。每次 staging 冒烟的报告生成都在生产库写入一个会话和 2 条消息（10-12 三次部署 ↔ 三个会话，时间一一对应）。app 的数据访问多数经 anon 密钥（anon 对 `public` 的表有完整读写权限，RLS 策略为 `USING(true)` 或未开启；2026-10-20 核实，见 TD-032），少数经 service_role，所以 staging 上跑的任何分支代码都能读写生产数据。Supabase 免费档的 2 个项目额度已用满（antelacus、goodman）。staging 的数据隔离是 REQ / DESIGN 必须回答的问题。候选做法是 antelacus 的两层（CI 用本地 Supabase 加合成数据测写库路径，staging 读生产、不能写），它以 TD-031 为前提；待核：Supabase 新 secret 密钥的 `secret_jwt_template.role`（Management API）能否绑定一个只读角色，给 staging 用
  - LLM：v4.7.0 起生产与 staging 都经第三方 relay（`LLM_BASE_URL`、`LLM_API_KEY`，见 `docs/features/ai-provider/DESIGN.md` §8）；relay 为预付费、无用量上限
  - 生产的 `docker-compose.yml` 在仓库外（`$GOODMAN_PROD_DIR/`）、属 root，deploy 用户改不了；构建参数仍含 `SUPABASE_SERVICE_ROLE_KEY` 与已删掉值的 `OPENAI_API_KEY`（构建时只报变量未设的警告）。范围 3、4 接手构建后随之退役（2026-10-22 核实）
  - The Floor：审计只数命中、看前缀，不读出密钥的值；不用历史里的凭据去验证它是否有效
- 裁定：
  - 2026-10-29 · Trivy 镜像扫描放进本版：v4.7.2 时镜像仍在 VPS 上构建，CI 扫不到上线的那一份 · Jason · 级联：本 TRACK 范围 3
  - 2026-10-19 · 远端旧分支（`maintenance/v4.6.4-*`、`claude/sharp-allen-*`）先逐个核对未合并提交、列给 Jason，再随 `development` 删除 · Jason · 级联：范围 2
  - 2026-10-19 · 技术债逐条裁定：TD-023、TD-029 公开前修；TD-027 新流水线中改为阻断；TD-025 删除（目标文件是历史快照）；TD-019 / 020 / 021 / 022 接受并附触发条件（TD-019 描述更正：OpenAI SDK 自带重试）；TD-021 的总花费兜底为公开前在服务商控制台设预算；TD-026 交 v4.8 Phase 0；TD-028 在 TD-027 删除后开 light 版本 · Jason · 级联：`docs/TECHNICAL_DEBT.md`
  - 2026-10-19 · TD-024 需要优化，但不在本版 · Jason · 级联：`docs/TECHNICAL_DEBT.md`（v4.8 Phase 0 排期）
  - 2026-10-22 · TD-021 的总花费兜底改为 relay 的预付余额（relay 不提供用量上限；推翻 10-19 的"在服务商控制台设预算"）；按 token 设限留到后续版本 · Jason · 级联：`docs/TECHNICAL_DEBT.md` TD-021
  - 2026-10-19 · 发布流水线顺延到 AI 服务切换（v4.7.0）之后：AI 不通，staging 检查无法验证；本 TRACK 的 Phase 0 工作与裁定保留，开工时重新执行 Phase 0 的核对 · Jason · 级联：`v4_DEVELOPMENT_PLAN.md` §3.11、§3.12
  - 2026-11-04 · 拆分：范围 1（泄密审计、TD-032 / TD-023 / TD-029、删除许可证、公开仓库）拆为单独的公开就绪版本，先于本版；与之相关的裁定（10-19 公开、历史密钥、许可证，10-20 TD-032）已迁入 `docs/features/public-readiness/TRACK.md`。公开为不可撤回操作：TD-032 在生产核实且审计通过后，经 Jason 明确同意才执行 · Jason · 级联：本 TRACK 范围 1、`v4_DEVELOPMENT_PLAN.md` §2.3 / §3.11 / §3.13、`docs/TECHNICAL_DEBT.md` TD-023 / 029 / 032
  - 2026-11-04 · 更正：10-19 裁定中 TD-026、TD-024 的"v4.8 Phase 0"改为"发布流水线之后的下一个版本 Phase 0"，与 `docs/TECHNICAL_DEBT.md` 一致；版本号开工时才分配，规划中不再写版本号 · Jason · 级联：无（登记表本已如此）

## 二、批次

（Phase 2 切分）

## 三、门与发布

**评审发现登记**：（Phase 2 起）

**Phase 4 证据**：（Phase 4）

## 四、Session-end pickup
