# Staging 发布/回滚演练记录

> 目标：验证 staging 发布流程、健康检查、冒烟测试与回滚流程可复现。

## 基本信息

- 日期：2026-01-19
- 演练环境：staging（http://localhost:3001）
- 执行人：Claude Code
- 关联分支/提交：`development` / `b0627ed`
- 关联 CI 运行链接：手动执行演练
- 演练窗口：00:35 - 00:42 (UTC)

## 预备条件

- [x] staging 环境可访问
- [x] `/api/health` 返回 200
- [x] `.env.staging` 已配置且不含生产密钥
- [ ] GlitchTip/Uptime Kuma 正常（observability 容器未部署，后续已改用 Sentry/UptimeRobot）
- [x] 已确认回滚目标（commit/tag/时间点）

## 发布演练

### 方式

- [ ] CI 自动（deploy-staging 工作流）
- [x] 手动执行

### 发布步骤记录

1. 确认 staging 容器运行状态：`docker ps --filter "name=goodman"`
2. 确认当前部署版本：`b0627ed`（`development` 分支）
3. 验证健康检查端点

手动参考命令（如适用）：

```bash
cd /home/deploy/goodman-staging/project-goodman
set -a && source ../.env.staging && set +a
docker compose -f docker-compose.staging.yml up -d --build
```

### 发布验证

**健康检查**

```bash
curl http://localhost:3001/api/health
```

- 返回结果：`{"status":"healthy","version":"4.3.0","timestamp":"2026-01-19T00:35:39.924Z","checks":{"database":{"status":"ok","latency":312},"redis":{"status":"ok","latency":5}}}`

**冒烟测试**

```bash
SMOKE_BASE_URL=http://localhost:3001 \
SMOKE_ENV_FILE=/home/deploy/goodman-staging/.env.staging \
node scripts/smoke-test-staging.js
```

- 执行结果：`[smoke] Smoke test completed successfully`
- 失败接口（如有）：无

### 发布结果

- 状态：✅ 通过
- 主要问题与处理：无

## 回滚演练

### 触发原因/条件

- 演练目的：验证回滚流程可复现

### 回滚目标

- commit/tag：`fa47f6f`
- 预期恢复版本：`docs(v4.4): add production readiness docs`

### 回滚步骤

1. 切换到目标 commit：`git checkout fa47f6f`
2. 重建容器：`docker compose -f docker-compose.staging.yml up -d --build`
3. 等待容器启动完成（约 5 秒）
4. 验证健康检查

手动参考命令（如适用）：

```bash
cd /home/deploy/goodman-staging/project-goodman
git checkout fa47f6f
set -a && source ../.env.staging && set +a
docker compose -f docker-compose.staging.yml up -d --build
```

> 回滚完成后切回 `development` 分支：

```bash
git checkout development
set -a && source ../.env.staging && set +a
docker compose -f docker-compose.staging.yml up -d --build
```

### 回滚验证

**健康检查**

```bash
curl http://localhost:3001/api/health
```

- 返回结果：`{"status":"healthy","version":"4.3.0","timestamp":"2026-01-19T00:41:41.196Z","checks":{"database":{"status":"ok","latency":180},"redis":{"status":"ok","latency":1}}}`

**关键路径验证**

- `/api/health`：✅ 200
- `/api/sessions`：✅ 200
- `/api/auth/login`：✅ 400（预期，密码错误）
- `/api/reports/generate`：✅ 400（预期，缺少参数）

### 回滚结果

- 状态：✅ 通过
- 主要问题与处理：无

## 结论与改进项

- 结论摘要：staging 发布/回滚流程验证成功，健康检查与冒烟测试均通过
- 需要改进的环节：
  1. GlitchTip/Uptime Kuma 容器尚未部署，可观测性验证暂缺（现已改用 Sentry/UptimeRobot）
  2. **CI 工作流缺少环境变量导出** - docker compose build args 需要在构建前导出环境变量
- 后续行动项：
  1. ✅ 已修复 `deploy-staging.yml` 和 `deploy.yml`，增加 `set -a && source .env && set +a`
  2. 配置 Sentry/UptimeRobot（可选，非阻断）

## 附件

- 关键日志片段：

```
[smoke] Using base URL http://localhost:3001
[smoke] Loaded env file /home/deploy/goodman-staging/.env.staging
[smoke] Health check
[smoke] Admin login
[smoke] Sessions API
[smoke] Report generation
[smoke] Smoke test completed successfully
```

- 截图/链接：无
