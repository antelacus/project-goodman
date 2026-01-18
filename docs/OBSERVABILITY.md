# 可观测性（Observability）

本文件记录自托管可观测性栈的部署与使用方式，覆盖错误追踪与健康检查监控。

## 组件概览

- **GlitchTip**：错误追踪（Sentry 兼容）
- **Uptime Kuma**：健康检查与 uptime 监控

## 文件与目录

- `docker-compose.observability.yml`：可观测性栈（GlitchTip / Uptime Kuma）
- `.env.observability`：生产/演示环境变量（自行创建）

## GlitchTip 部署

### 1. 准备环境变量

```bash
cp .env.observability.example $GOODMAN_PROD_DIR/.env.observability
```

> `GLITCHTIP_DOMAIN` 需要包含协议（例如 `https://glitchtip.example.com`），`GLITCHTIP_ALLOWED_HOSTS` 仅填写域名列表（不含协议）。

### 2. 初始化数据库

```bash
docker compose -f docker-compose.observability.yml \
  --env-file $GOODMAN_PROD_DIR/.env.observability \
  run --rm glitchtip-migrate
```

### 3. 启动服务

```bash
docker compose -f docker-compose.observability.yml \
  --env-file $GOODMAN_PROD_DIR/.env.observability \
  up -d glitchtip glitchtip-worker glitchtip-postgres glitchtip-redis
```

### 4. 访问与初始化

- 本机访问：`http://127.0.0.1:8001`
- 首次访问后创建管理员账号
- 创建 Organization / Project 后获取 DSN

> 默认仅绑定 `127.0.0.1`，如需外网访问请通过反向代理暴露。

## Uptime Kuma 监控

### 1. 启动服务

```bash
docker compose -f docker-compose.observability.yml \
  --env-file $GOODMAN_PROD_DIR/.env.observability \
  up -d uptime-kuma
```

### 2. 访问地址

- 本机访问：`http://127.0.0.1:${UPTIME_KUMA_PORT}`（默认 3002）

### 3. 监控项配置

建议添加以下 HTTP 检查：

- 生产：`https://<prod-domain>/api/health`
- Staging：`https://<staging-domain>/api/health`

### 4. 告警渠道

在 Uptime Kuma 控制台中配置通知（邮件/IM），并在项目运维文档中记录：

- 告警渠道类型与目标地址
- 触发阈值（例如 1 分钟内连续失败 N 次）
