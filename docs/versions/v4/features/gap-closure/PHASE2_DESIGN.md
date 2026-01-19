# v4.5 生产就绪缺口补齐 - Phase 2 设计文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 生产就绪缺口补齐 (Gap Closure) |
| **版本** | v4.5 |
| **状态** | Phase 2 - 设计完成 |
| **Phase 1 文档** | [PHASE1_REQ.md](./PHASE1_REQ.md) |

---

## 设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| 监控与告警 | Sentry Performance + UptimeRobot | 免运维、成本低、证据链可展示 |
| 性能基线工具 | autocannon | Node 生态、轻量、CI 易用 |
| A11y/性能基线 | Lighthouse CI + axe | 评分 + 规则双重验证 |
| 回归门禁策略 | 相对阈值（+20% / 评分下降≤5） | 初期抗噪、可逐步收敛 |
| 文档入口 | README 双受众 | 用户/雇主/开发者需求兼顾 |
| 安全审计门禁 | npm audit High+Critical + 豁免清单 | 可信门禁 + 可控例外 |

---

## 1. 架构概览

### 1.1 监控与门禁拓扑

```
                ┌─────────────────────────┐
                │        GitHub CI        │
                │  lint/test/build/gates  │
                └────────────┬────────────┘
                             │
                ┌────────────┴────────────┐
                │    Baseline & Gates     │
                │  Lighthouse / axe / perf │
                └────────────┬────────────┘
                             │ baseline files
                             ▼
                     ┌───────────────┐
                     │   Repository  │
                     │  baselines/   │
                     └───────────────┘

        ┌───────────────────────────────────────────────┐
        │                    SaaS                        │
        │  Sentry Performance (API 事务) + UptimeRobot  │
        └───────────────────────────────────────────────┘
```

### 1.2 数据流（证据链）

1) CI 或本地生成 Lighthouse/axe/autocannon 结果。
2) 基线结果存档到仓库固定目录，形成“基线快照”。
3) CI 每次运行读取基线并对比，超阈值直接失败。
4) 线上 Sentry Performance 记录关键 API 事务并告警；UptimeRobot 记录可用性。
5) README/OBSERVABILITY/CLAUDE.md 记录门禁与阈值配置。

---

## 2. 组件设计

### 2.1 Sentry Performance（API 事务）

- 在 server-only 环境启用 `tracesSampleRate`（可配置）。
- 为关键 API 设置统一事务命名（建议格式：`api.chat.stream`、`api.reports.generate` 等）。
- 告警策略写入 `docs/OBSERVABILITY.md`（阈值、通知渠道、责任人）。

> 页面性能阈值由 Lighthouse CI 基线承担；如需前端事务，可后续升级到 `@sentry/nextjs`。

### 2.2 性能/稳定性基线（autocannon）

- 对关键 API 运行固定并发/时长测试，输出 P50/P95/P99、吞吐量与失败率。
- 回归阈值：P95/失败率允许 +20% 退化。
- 基线结果存档为 JSON，CI 读取并对比。

### 2.3 Lighthouse CI 基线

- 覆盖路由：`/`、`/chat`（报告入口在统一聊天）。
- 生成 JSON/HTML 报告并存档。
- 回归阈值：评分下降 ≤5 分（性能/可访问性）。

### 2.4 A11y 基线（axe）

- 使用 `@axe-core/playwright` 进行规则级检查。
- 门禁标准：无新增严重/关键违规。
- 结果存档为 JSON，CI 读取并对比。

### 2.5 安全审计门禁

- CI 中执行 `npm audit --json`，High/Critical 触发失败。
- 允许显式豁免清单（含理由与到期时间）。

### 2.6 README 双受众入口

- 保留用户向内容结构。
- 新增开发者入口：技术栈、环境变量、本地运行、测试与门禁命令。

---

## 3. 基线存档与目录规划

建议目录结构：

```
/tests/quality-baselines/
  ├─ lighthouse/
  ├─ a11y/
  └─ performance/
/scripts/quality-gates/
```

- `lighthouse/`：基线 JSON/HTML 与对比输出
- `a11y/`：axe 规则检查基线
- `performance/`：autocannon 基线

---

## 4. 配置与环境变量

- `SENTRY_TRACES_SAMPLE_RATE`：Sentry Performance 采样率（默认 0）。
- `PERF_TEST_MODE`：性能基线运行模式（仅测试环境启用）。
- `QUALITY_GATES_STRICT`：门禁严格开关（紧急回滚用）。

所有新增变量需补充到 `.env.example`。

---

## 5. 迁移策略

1. 先引入依赖与脚本（Lighthouse CI、axe、autocannon）。
2. 生成基线快照并纳入版本控制。
3. 接入 CI 门禁，确保回归可检测。
4. 更新 README/CLAUDE/OBSERVABILITY 文档。

---

## 6. 回滚策略

- 门禁失败导致阻塞时，优先回滚基线文件或调整阈值配置。
- 紧急情况下可关闭 `QUALITY_GATES_STRICT` 或暂时豁免。
- 任何豁免必须记录原因与到期时间。

---

## 7. 测试与验证

- Lighthouse：`npm run test:lighthouse`
- A11y：`npm run test:a11y`
- 性能基线：`npm run test:perf`
- 审计门禁：`npm run test:audit`

以上命令需在 CI 中可复现运行，并输出可审计结果。
