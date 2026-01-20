# v4.5 生产就绪缺口补齐 - Phase 3-5 实现跟踪

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 生产就绪缺口补齐 (Gap Closure) |
| **版本** | v4.5 |
| **状态** | Phase 3-5 - 未开始 |
| **设计文档** | [PHASE2_DESIGN.md](./PHASE2_DESIGN.md) |

---

## 实现任务清单

### A. 监控与性能阈值

#### Task A1: 启用 Sentry Performance

- [x] 在 `src/lib/observability/error-tracking.ts` 配置可调 `tracesSampleRate`
- [x] 为关键 API 统一事务命名（`api.chat.stream` 等）
- [x] 更新 `.env.example`（SENTRY_TRACES_SAMPLE_RATE）

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-19 10:05
完成时间: 2026-01-19 10:35
变更点:
- 新增 SENTRY_TRACES_SAMPLE_RATE 解析与 span helper
- 关键 API 事务命名：chat/report/upload/extract
- .env.example 增加 traces sample rate 配置
测试: npm test -- --run tests/unit/observability/error-tracking.test.ts
```

#### Task A2: 告警策略文档化

- [x] 更新 `docs/OBSERVABILITY.md`（阈值/通知渠道/责任人）
- [x] 明确 API 与页面范围（API 事务 + Lighthouse 页面基线）

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-19 10:36
完成时间: 2026-01-19 10:45
变更点:
- docs/OBSERVABILITY.md 增加性能阈值、告警渠道与责任人
- 明确 API 事务范围与 Lighthouse 页面基线范围
```

---

### B. 性能基线（autocannon）

#### Task B1: 性能测试工具与脚本

- [x] 安装 `autocannon`
- [x] 新增性能基线脚本（固定并发/时长/P95 输出）
- [x] 增加 `npm run test:perf` 脚本

#### Task B2: 性能测试模式与基线

- [x] 增加 `PERF_TEST_MODE` 测试模式（仅非生产生效）
- [x] 为关键 API 提供稳定、可复现的测试路径
- [x] 生成基线快照并存档（`tests/quality-baselines/performance/`）

#### Task B3: CI 门禁接入

- [x] 对比当前结果与基线（+20% 阈值）
- [x] 超阈值阻断 CI

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-19 13:05
完成时间: 2026-01-20 02:00
变更点:
- 新增 perf gate 脚本与基线目录（tests/quality-baselines/performance）
- 关键 API 增加 PERF_TEST_MODE 快速路径（chat/report/upload/extract）
- CI 增加 perf gate（基线文件存在时才启用）
- .env.example 增加 PERF_TEST_MODE 与 QUALITY_GATES_STRICT
- 生成 perf 基线快照（tests/quality-baselines/performance/perf-baseline.json）
  - 覆盖场景：chat.stream / reports.generate / documents.upload-temp / quick-actions.extract
  - 测试配置：1 connection, 10s duration, 5 max requests
```

---

### C. Lighthouse CI 基线

#### Task C1: Lighthouse 配置

- [x] 新增 `lighthouserc` 配置
- [x] 增加 `npm run test:lighthouse` 脚本

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-20 02:15
完成时间: 2026-01-20 02:35
变更点:
- 新增 lighthouserc.cjs（基于环境变量的基础 URL 与输出目录）
- package.json 增加 test:lighthouse 脚本与 @lhci/cli
测试: 未运行（依赖安装与本地/CI 运行确认）
```

#### Task C2: 基线生成与存档

- [x] 生成 `/` 与 `/chat` 基线报告
- [x] 存档到 `tests/quality-baselines/lighthouse/`

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-20 03:00
完成时间: 2026-01-20 03:17
变更点:
- 生成 Lighthouse 基线（/ 与 /chat）
- 基线存档至 tests/quality-baselines/lighthouse（JSON + HTML）
- lighthouserc.cjs 的 chromeFlags 改为字符串形式，确保 --no-sandbox 生效
测试: CHROME_PATH=~/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome LHCI_BASE_URL=http://127.0.0.1:3000 npm run test:lighthouse
```

#### Task C3: CI 门禁

- [ ] 对比基线分数（允许下降 ≤5）
- [ ] 超阈值阻断 CI

---

### D. A11y 基线（axe）

#### Task D1: A11y 测试脚本

- [ ] 安装 `@axe-core/playwright`
- [ ] 编写 `/` 与 `/chat` A11y 检查
- [ ] 增加 `npm run test:a11y` 脚本

#### Task D2: 基线与门禁

- [ ] 生成基线并存档到 `tests/quality-baselines/a11y/`
- [ ] 无新增严重/关键违规门禁
- [ ] CI 中执行并阻断失败

---

### E. README 开发者入门

#### Task E1: README 双受众优化

- [ ] 增加技术栈概览
- [ ] 增加本地运行与环境变量配置说明
- [ ] 增加测试/门禁命令说明

---

### F. 文档一致性对齐

#### Task F1: CLAUDE.md 更新

- [ ] 修正技术栈依赖（mathjs/exceljs 等）
- [ ] 更新可观测性说明（Sentry + UptimeRobot + Performance）

#### Task F2: 运维文档更新

- [ ] `docs/OBSERVABILITY.md` 增加性能阈值/门禁说明
- [ ] `docs/DEPLOYMENT_CHECKLIST.md` 增加 Lighthouse/A11y/Perf/Audit 门禁

---

### G. 安全审计门禁

#### Task G1: audit gate

- [ ] 新增审计脚本（High+Critical）
- [ ] 允许显式豁免清单（含理由与到期时间）
- [ ] 增加 `npm run test:audit` 脚本

#### Task G2: CI 接入

- [ ] CI 中 audit 失败直接阻断
- [ ] 记录现有高危依赖修复计划

---

## Phase 5 测试清单（全部任务完成后）

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run test -- --run`
- [ ] `npm run test:coverage`
- [ ] `npm run test:lighthouse`
- [ ] `npm run test:a11y`
- [ ] `npm run test:perf`
- [ ] `npm run test:audit`
- [ ] 更新本 TRACK 测试记录
