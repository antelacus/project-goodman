# v4.5 生产就绪缺口补齐 - Phase 1 需求文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 生产就绪缺口补齐 (Gap Closure) |
| **版本** | v4.5 |
| **依赖** | v4.4 生产就绪（已发布） |
| **状态** | Phase 1 - 需求定义 |

参考文档：
- `docs/plans/2026-01-17-production-readiness-gap-analysis-design.md`
- `docs/plans/2026-01-19-gap-closure-design.md`

---

## 问题陈述

v4.4 已补齐 staging、CI、可观测性基础与核心文档，但仍缺少以下关键证据：

1. **指标/性能阈值与告警**：仅有 uptime，缺少性能类阈值
2. **性能预算与稳定性基线**：无负载/稳定性基线与回归门禁
3. **自动化 A11y/Lighthouse**：缺量化基线与 CI 门禁
4. **开发者入门与本地环境文档**：对外展示工程化入口不足
5. **文档一致性**：CLAUDE.md 与当前依赖/可观测性描述滞后
6. **安全审计门禁**：`npm audit` 非硬门禁且无豁免机制

本版本目标是补齐以上缺口，形成可对外展示的完整证据链。

---

## 范围

### 范围内

1. Sentry Performance + UptimeRobot 的性能阈值与告警
2. 性能预算与稳定性测试基线（轻量脚本）
3. Lighthouse CI + axe 的 A11y/性能基线与回归门禁
4. README 补齐开发者入门/本地环境说明
5. 文档一致性对齐（CLAUDE.md/OBSERVABILITY.md 等）
6. `npm audit` 高危/严重门禁与豁免清单机制

### 范围外

- 多区域/多集群部署
- 重型性能压测平台与容量规划
- 业务功能变更或新功能开发
- 数据备份/灾备体系

---

## 需求详情

### REQ-A1: 指标/性能阈值与告警（SaaS 方案）

**当前状态**：仅 uptime 监控，无性能阈值与告警。

**目标状态**：
- 基于 Sentry Performance 定义关键事务与阈值
- 覆盖关键 API 与关键页面加载
- 告警策略文档化（阈值、通知渠道、责任人）

**覆盖范围**：
- API：`/api/chat/stream`、`/api/reports/generate`、`/api/documents/upload-temp`、`/api/quick-actions/extract`
- 页面：`/`、`/chat`（报告入口在统一聊天）

**验收标准**：
- [ ] Sentry 中存在对应事务与阈值配置
- [ ] 告警策略记录在 `docs/OBSERVABILITY.md`
- [ ] 关键事务可在 Sentry Performance 中检索与追踪

---

### REQ-B1: 性能预算与稳定性测试基线

**当前状态**：缺少稳定性/负载基线与回归门禁。

**目标状态**：
- 选型轻量性能脚本（Node 工具或脚本）
- 对关键 API 建立延迟与失败率基线
- 采用相对回归阈值（先相对、后绝对）

**验收标准**：
- [ ] 关键 API 性能基线可复现（脚本 + 基线结果）
- [ ] CI 或可重复命令执行并对比基线
- [ ] 超过回归阈值时可阻断流程

---

### REQ-C1: Lighthouse CI 基线与门禁

**当前状态**：缺少 Lighthouse 基线与 CI 门禁。

**目标状态**：
- 使用 Lighthouse CI 生成 `/` 与 `/chat` 基线报告
- 建立相对回归门禁

**验收标准**：
- [ ] 基线结果存档（JSON/HTML）
- [ ] CI 中运行 Lighthouse CI 并对比基线
- [ ] 超过退化阈值时门禁失败

---

### REQ-C2: A11y 自动化基线（axe）

**当前状态**：缺少自动化 a11y 规则检查。

**目标状态**：
- 使用 `@axe-core/playwright` 对 `/` 与 `/chat` 进行规则检查
- 规则级门禁：无新增严重/关键违规

**验收标准**：
- [ ] A11y 结果可复现（报告或 JSON）
- [ ] CI 中执行 a11y 检查
- [ ] 违规阈值被触发时阻断流程

---

### REQ-D1: README 开发者入门（双受众）

**当前状态**：README 仅面向用户，无开发者快速开始。

**目标状态**：
- README 增加开发者入口：技术栈、环境变量、本地运行、测试命令
- 保持用户向内容结构不被破坏

**验收标准**：
- [ ] README 包含“开发者快速开始”与“技术栈概览”
- [ ] 明确 `.env.example` 的使用方式与必要配置
- [ ] 本地运行与测试命令可直接复制执行

---

### REQ-D2: 文档一致性对齐

**当前状态**：CLAUDE.md 与可观测性/依赖描述存在滞后。

**目标状态**：
- 更新 CLAUDE.md 的 Tech Stack 与 Observability 描述
- 与现有文档保持一致（Sentry + UptimeRobot、mathjs/exceljs 等）

**验收标准**：
- [ ] CLAUDE.md 与 `docs/OBSERVABILITY.md` 一致
- [ ] 依赖与模型描述与当前实现一致

---

### REQ-E1: 安全审计门禁（High + Critical）

**当前状态**：`npm audit` 非硬门禁。

**目标状态**：
- `npm audit` 高危/严重作为硬门禁
- 允许显式豁免清单（含理由与到期时间）

**验收标准**：
- [ ] CI 中 High/Critical 触发失败
- [ ] 豁免清单可追踪且有到期机制
- [ ] 有可用修复时优先升级依赖
