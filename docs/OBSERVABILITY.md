# 可观测性（Observability）

本文件记录当前可观测性方案（第三方 SaaS）以及配置与使用方式。

## 组件概览（当前）

- **Sentry（SaaS）**：错误追踪
- **UptimeRobot（SaaS）**：健康检查与 uptime 监控

> 说明：第三方 SaaS 需要公网可访问地址。当前仅监控生产域名 `https://goodman.antelacus.com`。

---

## Sentry（错误追踪）

### 1) 创建项目并获取 DSN

1. 登录 Sentry 控制台，创建项目（平台选择 Node.js）
2. 获取项目 **DSN**

### 2) 配置环境变量

在生产环境 `.env` 中配置：

```
SENTRY_DSN="https://<public-key>@oXXXX.ingest.sentry.io/XXXX"
SENTRY_ENV="production"
```

> 兼容说明：代码仍支持 `GLITCHTIP_DSN` 与 `GLITCHTIP_ENV`（历史变量），但推荐使用 `SENTRY_*`。

### 3) 重启生产容器

```bash
cd /home/deploy/goodman/project-goodman
set -a && source /home/deploy/goodman/.env && set +a
docker compose up -d --build
```

### 4) 验证方式

- 触发一次 5xx 错误并在 Sentry 中确认事件到达
- 或使用 Sentry 的 “Send Test Event” 功能

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

## 历史方案（已弃用）

此前使用自托管 GlitchTip + Uptime Kuma。

现已停用并切换为 SaaS 方案，相关自托管配置已从仓库移除。
