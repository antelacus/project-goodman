# v4.5 生产就绪缺口补齐 - 设计方案

> 日期：2026-01-19
> 目标：在 v4.4 基础上补齐剩余生产就绪缺口，形成可对外展示的完整证据链。

---

## 1. 背景与目标

v4.4 已完成 staging、CI 门禁、可观测性与核心文档，但仍缺少指标/性能阈值、性能预算与稳定性基线、自动化 A11y/Lighthouse、开发者入门文档、文档一致性与安全审计门禁。本方案以“基线 → 回归门禁 → 文档证据”的闭环为核心，采用 SaaS 轻量方案（Sentry Performance + UptimeRobot）与可复现的 CI 基线工具（Lighthouse CI + axe + 轻量性能脚本），在不引入重平台的前提下完成所有缺口补齐。

**非目标**：多区域/多集群、重型性能压测平台、平台迁移、业务功能改动。

---

## 2. 架构与组件

**可观测性**：延续 Sentry + UptimeRobot，新增性能事务与阈值告警；覆盖关键 API 与关键页面加载。

**基线与门禁**：
- Lighthouse CI：生成 `/` 与 `/chat`（报告入口在统一聊天）基线报告，建立相对回归门禁。
- @axe-core/playwright：生成 A11y 规则级报告，门禁为“无新增严重/关键违规”。
- 轻量性能/稳定性脚本：针对 `/api/chat/stream`、`/api/reports/generate`、`/api/documents/upload-temp`、`/api/quick-actions/extract` 建立延迟与失败率基线；CI 比对相对回归阈值。

**文档与一致性**：README 增强为“双受众”（用户 + 开发者），补齐本地开发、测试、运行说明；更新 CLAUDE.md 与 OBSERVABILITY.md，确保技术栈与可观测性描述一致。

**安全审计门禁**：`npm audit` 作为硬门禁（High+Critical），允许显式豁免清单（含理由与到期时间）。

---

## 3. 数据流与证据链

1) CI 或本地执行基线任务（Lighthouse、axe、性能脚本），生成结果 JSON。
2) 将基线结果存档（仓库内固定位置），形成可追溯基线快照。
3) 每次 CI 运行读取基线并比较，若超过允许退化阈值则失败。
4) 线上由 Sentry Performance 持续采集事务数据并触发告警；UptimeRobot 提供可用性证据。
5) 文档记录基线指标、门禁规则与豁免项，形成对外展示证据链。

---

## 4. 错误处理与风险

- 门禁失败应输出可读差异（页面/指标/阈值），便于快速定位。
- 采用相对阈值降低初期噪声；后续可收敛为绝对阈值。
- 性能测试受环境影响，需固定 CI 运行环境与可重复命令。

---

## 5. 测试与验证

- Lighthouse CI 与 axe 在 CI 中执行，覆盖 `/` 与 `/chat`。
- 轻量性能/稳定性脚本在 CI 中执行并与基线对比。
- Sentry 性能事务与告警规则在文档中可复核（阈值、覆盖范围、责任人）。

---

## 6. 交付物

- `docs/versions/v4/features/gap-closure/PHASE1_REQ.md`
- Lighthouse + axe + 性能基线脚本与配置
- README 与 CLAUDE.md 文档对齐
- 安全审计门禁与豁免清单机制
