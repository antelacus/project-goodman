# 可观测性（Observability）

本文件记录当前可观测性方案（第三方 SaaS）以及配置与使用方式。

## 组件概览（当前）

- **Sentry（SaaS）**：错误追踪
- **UptimeRobot（SaaS）**：健康检查与 uptime 监控

> 说明：第三方 SaaS 需要公网可访问地址。当前仅监控生产域名 `https://goodman.antelacus.com`。

---

## Sentry（错误追踪 + 性能）

### 1) 创建项目并获取 DSN

1. 登录 Sentry 控制台，创建项目（平台选择 Node.js）
2. 获取项目 **DSN**

### 2) 配置环境变量

在生产环境 `.env` 中配置：

```
SENTRY_DSN="https://<public-key>@oXXXX.ingest.sentry.io/XXXX"
SENTRY_ENV="production"
SENTRY_TRACES_SAMPLE_RATE="0.1" # 0-1 之间，默认 0
```

> 兼容说明：代码仍支持 `GLITCHTIP_DSN` 与 `GLITCHTIP_ENV`（历史变量），但推荐使用 `SENTRY_*`。

### 3) 重启生产容器

```bash
cd $GOODMAN_PROD_DIR/project-goodman
set -a && source $GOODMAN_PROD_DIR/.env && set +a
docker compose up -d --build
```

### 4) 验证方式

- 触发一次 5xx 错误并在 Sentry 中确认事件到达
- 或使用 Sentry 的 “Send Test Event” 功能

---

## Sentry Performance（性能阈值与告警）

### 1) 事务范围（关键 API）

统一事务名称（Server-only）：

- `api.chat.stream`
- `api.reports.generate`
- `api.documents.upload-temp`
- `api.quick-actions.extract`

> 页面级性能阈值由 Lighthouse CI 负责（见 CI 门禁与基线），不依赖 Sentry 页面事务。

### 2) 性能阈值（对齐 v4.6 目标）

| 事务 | 阈值（P95 上限） | 失败率阈值 | 说明 |
|------|------------------|------------|------|
| api.chat.stream | <= 12s | > 2% | SSE 流式响应，关注整体延迟（首 token 见日志指标） |
| api.reports.generate | <= 60s | > 2% | 报告生成流程 |
| api.documents.upload-temp | <= 45s | > 2% | 上传 + 解析 + 抽取 |
| api.quick-actions.extract | <= 1s | > 2% | 非 AI 快速提取路径目标 |

> 以上阈值与 v4.6 目标对齐；Sentry 告警规则以此为基准配置。

### 2.1) 日志 → 指标映射（v4.6）

统一使用 `logWorkflowEvent` 的结构化字段聚合指标：

- **聚合字段**：`workflow` / `step` / `status` / `duration` / `errorType` / `requestId`
- **成功率**：`step=success` / 总请求数（每条流程）
- **错误率**：
  - **5xx**：基于 `logRequest` 的 `status` 统计（目标 <= 0.5%）
  - **流程失败**：`step=failure` 计数（目标 ≤ 2%）
- **P95**：按 `workflow` 聚合 `duration` 计算
- **首 token P95**：`workflow=chat_stream` + `step=first_token` 的 `duration`

### 3) 告警策略（记录）

- **告警渠道**：Sentry Email（绑定邮箱）+ 团队 IM（如企业微信/钉钉/Slack）
- **责任人**：项目负责人（Project Lead）
- **触发条件**：P95 超阈值或失败率超阈值（5-10 分钟窗口）
- **对齐说明**：Sentry Performance 告警规则按上表阈值配置；UptimeRobot 继续覆盖 `/api/health`

---

## UptimeRobot（健康检查）

### 1) 新建监控项

- 类型：HTTP(s)
- URL：`https://goodman.antelacus.com/api/health`
- 期望：200
- 监控频率：建议 5 分钟

### 2) 告警渠道

在 UptimeRobot 中配置通知渠道（邮件/IM），记录在运维文档中：

- 告警渠道类型与目标地址
- 触发阈值（例如连续失败 N 次）

### 3) Staging（可选）

如需监控 staging，请先配置公网可访问域名，再添加 `https://<staging-domain>/api/health`。

---

## CI 质量门禁（基线与回归）

> 说明：以下门禁用于构建期质量控制，与线上监控互补，形成可审计证据链。

### 基线与回归规则

- **Lighthouse CI**：`/` 与 `/chat` 基线存档在 `tests/quality-baselines/lighthouse/`，性能/可访问性评分下降 > 5 触发失败
- **A11y（axe）**：基线存档在 `tests/quality-baselines/a11y/a11y-baseline.json`，不允许新增 critical/serious 违规
- **性能基线（autocannon）**：基线存档在 `tests/quality-baselines/performance/perf-baseline.json`，P95 或失败率退化 > 20% 触发失败
- **安全审计**：`npm audit` 的 High/Critical 作为硬门禁（允许带到期时间的豁免清单）

### 相关命令

```
npm run test:lighthouse
npm run test:a11y
npm run test:perf
npm run test:audit
```

> 可通过 `QUALITY_GATES_STRICT` 控制门禁严格程度（紧急回滚场景使用）。

---

## 历史方案（已弃用）

此前使用自托管 GlitchTip + Uptime Kuma。

现已停用并切换为 SaaS 方案，相关自托管配置已从仓库移除。
