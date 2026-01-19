# 生产就绪差距分析（资源约束版）

> **日期**：2026-01-17
> **项目**：Project Goodman
> **目标**：基于现有基础设施（Docker Compose + VPS + Supabase Cloud），评估“可立即部署的生产级展示项目”所需基线与现状差距，并形成分级路线图。

---

## 1. 目标与范围

**目标**：在不重构/不换平台的前提下，找出当前项目与“可信生产级展示”之间的最小差距，并给出优先级与可执行路线图。

**范围**：
- 代码与工程质量（lint、类型、模块边界）
- 文档与入门（README、架构说明、运维手册）
- 安全（依赖风险、鉴权、密钥管理、审计）
- 测试与质量门禁（单元/集成/E2E、CI 规则）
- CI/CD 与发布流程（自动化、环境分离、回滚）
- 可观测性与运维（日志、指标、告警、健康检查）
- 可靠性与性能（SLO/基线/性能预算）
- UX 与可访问性（错误边界、无障碍）

**假设**：
- 目前只有生产环境；staging 处于“计划/缺失”状态。
- 数据来自公司内部数据库，数据备份/DR 不在本项目范围内。
- 不做平台迁移（不引入 K8s/多区域）。

---

## 2. 方法与评分

**状态定义**：
- ✅ 已完成：有清晰证据且可用
- ⚠️ 部分完成：有基础但缺少关键环节
- ❌ 缺口：当前缺失或仅有计划

**评分**：
- **影响（1–5）**：影响生产可信度/稳定性/安全性
- **发生可能性（1–5）**：问题发生概率
- **风险分** = 影响 × 可能性

**优先级**：
- **P0（必须）**：面向“生产就绪展示”的最低门槛
- **P1（应当）**：提升专业性与可信度
- **P2（可选）**：锦上添花

---

## 3. 证据来源（抽样）

- `docs/DEPLOYMENT_CHECKLIST.md`：部署流程、健康检查、安全基线
- `.github/workflows/ci.yml`、`.github/workflows/deploy.yml`：CI/CD 自动化
- `docs/TECHNICAL_DEBT.md`：已知问题与风险记录
- `package.json`、`.husky/`：质量门禁（lint/test/tsc）
- `tests/unit/`：单元测试现状
- `.claude/rules/code-conventions.md`：安全/数据库设计决策
- `CLAUDE.md`：技术栈与项目定位（存在内容滞后）

---

## 4. 差距矩阵（现状 vs 基线）

### 4.1 文档与入门

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| 用户向 README（非技术） | `README.md` | ✅ | 已面向用户/招聘展示
| 架构总览（单一权威文档） | 仅散见于历史版本文档 | ❌ | 架构信息分散，不利于外部理解
| 运维/故障处置手册 | `docs/DEPLOYMENT_CHECKLIST.md` | ⚠️ | 有部署与回滚，但缺少故障分级/响应流程
| 开发者入门与本地环境说明 | 无专门文档 | ❌ | 对外展示时缺乏工程化入口
| 文档一致性与更新机制 | `docs/TECHNICAL_DEBT.md` 与 `CLAUDE.md` 不一致 | ⚠️ | 技术栈描述滞后（依赖已更新）

### 4.2 代码质量与架构卫生

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| Lint/Type Check/Pre-commit | `package.json`、`.husky/` | ✅ | 已有 lint + tsc 门禁
| 模块组织与规范 | `src/` 结构 + `.claude/rules` | ✅ | 清晰分层
| 关键架构决策记录 | 分散于历史版本文档 | ⚠️ | 缺少“当前版本架构摘要”

### 4.3 安全

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| 输入验证与统一错误响应 | `.claude/rules/code-conventions.md` | ✅ | API 规范明确
| 依赖漏洞扫描 | CI 中 `npm audit` | ⚠️ | `continue-on-error`，未作为硬门禁
| 安全实践文档 | 无 `SECURITY.md` | ❌ | 对外缺失安全说明/披露流程
| 密钥管理与泄露防护 | repo 中存在 `.env` | ⚠️ | 需确认仅占位符，避免真实密钥进入仓库

### 4.4 测试与质量门禁

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| 单元测试 | `tests/unit/` | ✅ | 已有稳定基础
| 集成测试（API/DB） | 无 | ❌ | 关键路径缺覆盖
| E2E/手工回归流程 | `docs/manual-test-log/` | ⚠️ | 有手工记录但未标准化流程
| 覆盖率基线/门槛 | 无 | ❌ | 无法证明质量水平

### 4.5 CI/CD 与发布

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| CI：lint/test/build | `.github/workflows/ci.yml` | ✅ | 已自动化
| 自动化部署 | `.github/workflows/deploy.yml` | ✅ | 已有生产部署
| Staging 环境 | 无 | ❌ | 无法进行发布前验证
| 回滚与发布策略 | `docs/DEPLOYMENT_CHECKLIST.md` | ⚠️ | 手工回滚，缺自动化与演练

### 4.6 可观测性与运维

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| 结构化日志 | `src/lib/logging/logger.ts` | ✅ | 已实现基础日志
| 健康检查 | `/api/health` | ✅ | 可用于探活
| 指标采集与告警 | 无 | ❌ | 生产级可观测性不足
| 错误追踪（Sentry 类） | 无 | ❌ | 线上问题定位成本高

### 4.7 可靠性 / 性能

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| Web Vitals 基线 | `WebVitals` 组件 | ⚠️ | 仅控制台输出，无仪表盘/阈值
| 性能预算/回归阈值 | 无 | ❌ | 无自动警戒
| 负载/稳定性测试 | 无 | ❌ | 无法证明高峰稳定性

### 4.8 UX 与可访问性

| 基线标准 | 证据 | 状态 | 备注/风险 |
|---|---|---|---|
| Error Boundary 与错误兜底 | 已实现 | ✅ | 基础完备
| 关键模态无障碍 | `useModalAccessibility` | ✅ | 基础完备
| 自动化 a11y/Lighthouse | 无 | ❌ | 对外展示缺“量化指标”

---

## 5. 风险排序（Top Gaps）

| Gap | 风险分 | 优先级 | 理由 |
|---|---|---|---|
| 缺少 Staging 环境与发布前验证 | 20 (5×4) | P0 | 直接影响发布可信度与稳定性
| 无集成/E2E 测试 | 20 (5×4) | P0 | 生产就绪展示缺乏关键证据
| 无监控/告警/错误追踪 | 20 (5×4) | P0 | 生产事故无法快速定位
| 安全基线文档缺失 | 12 (3×4) | P1 | 对外可信度不足
| 架构总览缺失/文档分散 | 12 (3×4) | P1 | 招聘/评审难以快速理解
| 覆盖率基线缺失 | 12 (3×4) | P1 | 质量门槛不明确
| CI 安全审计非硬门禁 | 9 (3×3) | P2 | 风险可控但建议补齐

---

## 6. 路线图（资源充足前提）

### 6.1 快速收益（1–2 周）

- **P0**：建立 staging 环境（与 prod 同构）
- **P0**：补齐关键 API 的集成测试（至少 chat/stream、documents/upload、reports）
- **P0**：引入错误追踪（Sentry）
- **P1**：新增 `docs/ARCHITECTURE.md`（当前版本架构总览）
- **P1**：新增 `docs/SECURITY.md`（安全边界、密钥策略、披露流程）

### 6.2 近期提升（3–6 周）

- **P0**：指标与告警（UptimeRobot + 关键 API 失败率）
- **P1**：覆盖率基线与门槛（例如 60% 起步）
- **P1**：标准化手工回归清单（与 release checklist 对齐）
- **P2**：Lighthouse/A11y 报告与评分基线

---

## 7. 附录：模板与示例（可直接落地）

> 以下为“最小化模板”，仅做方向参考，避免一次性引入重平台。

### 7.1 Staging 部署工作流（GitHub Actions 示例）

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging
on:
  push:
    branches: [development]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_KEY }}
          script: |
            cd /home/deploy/goodman-staging
            git pull origin development
            docker compose up -d --build
            sleep 15
            curl -f http://localhost:3000/api/health || exit 1
```

### 7.2 事故响应 Runbook 模板（摘要版）

```markdown
# Incident Runbook (Draft)

## 1. 事件分级
- P0: 服务不可用/数据泄露
- P1: 核心功能不可用
- P2: 降级/性能问题

## 2. 处置流程
1) 确认影响范围
2) 回滚/降级/限制流量
3) 收集日志与时间线
4) 修复与复盘
```

### 7.3 监控与告警最小方案（无侵入）

- **Uptime**：UptimeRobot 监控 `/api/health`
- **Error Tracking**：Sentry（最小 SDK 引入）
- **日志**：继续输出 JSON，后续可接 Loki/ELK

---

## 8. 结论

当前项目已经具备了“专业展示”的基础（文档、质量门禁、CI/CD、结构化日志、健康检查）。最大的差距在于：**staging 环境、集成/E2E 测试、监控与告警、架构与安全的对外文档**。这些是生产就绪“可信度”的关键证据。

如果需要，我可以把本分析转化为 **v4.4 的 Phase 1 REQ 文档**，并拆解为可执行任务清单。
