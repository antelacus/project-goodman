# Staging 发布/回滚演练记录

> 目标：验证 staging 发布流程、健康检查、冒烟测试与回滚流程可复现。

## 基本信息

- 日期：2026-01-18
- 演练环境：staging（http://localhost:3001）
- 执行人：Claude Code + User
- 关联分支/提交：`development` / `b0627ed`
- 关联 CI 运行链接：N/A（手动演练）
- 演练窗口：09:00 - 10:20 UTC

## 预备条件

- [x] staging 环境可访问
- [x] `/api/health` 返回 200
- [x] `.env.staging` 已配置且不含生产密钥
- [ ] GlitchTip/Uptime Kuma 正常（未部署）
- [x] 已确认回滚目标（commit/tag/时间点）

## 发布演练

### 方式

- [ ] CI 自动（deploy-staging 工作流）
- [x] 手动执行

### 发布步骤记录

1. 克隆代码到 staging 目录：`git clone ... $GOODMAN_STAGING_DIR/project-goodman`
2. 切换到 development 分支
3. 配置 `.env.staging`（从生产复制并调整）
4. 修复 @sentry/node webpack 构建问题（临时 stub）
5. 构建并启动容器

手动参考命令（如适用）：

```bash
cd $GOODMAN_STAGING_DIR/project-goodman

# 需先 source 环境变量以传递 build args
set -a && source ../.env.staging && set +a

docker compose -f docker-compose.staging.yml up -d --build
```

### 发布验证

**健康检查**

```bash
curl http://localhost:3001/api/health
```

- 返回结果：`{"status":"healthy","version":"4.3.0","timestamp":"2026-01-18T10:07:39.347Z","checks":{"database":{"status":"ok","latency":125},"redis":{"status":"ok","latency":2}}}`

**冒烟测试**

```bash
SMOKE_BASE_URL=http://localhost:3001 \
ADMIN_PASSWORD=<admin-password> \
node scripts/smoke-test-staging.js
```

- 执行结果：`[smoke] Smoke test completed successfully`
- 失败接口（如有）：无

### 发布结果

- 状态：✅ 通过
- 主要问题与处理：
  1. **@sentry/node webpack 构建失败**：@sentry/node 使用 `node:` URL 导入，webpack 无法处理。临时解决方案：stub 掉 error-tracking.ts。需要后续修复。
  2. **环境变量传递**：docker-compose build args 需要手动 source .env.staging 或在 CI 中配置环境变量。
  3. **Admin 密码**：smoke test 需要明文密码，而 .env 中存储的是 bcrypt hash。需要单独传递 ADMIN_PASSWORD 环境变量。

## 回滚演练

### 触发原因/条件

- 演练目的：验证回滚流程可行

### 回滚目标

- commit/tag：`fa47f6f`
- 预期恢复版本：v4.3.0（docs 变更前一个提交）

### 回滚步骤

1. `git checkout fa47f6f`（进入 detached HEAD）
2. 应用必要的构建修复（error-tracking.ts stub）
3. 重新构建并启动容器

手动参考命令（如适用）：

```bash
cd $GOODMAN_STAGING_DIR/project-goodman

git checkout fa47f6f

# 应用构建修复后
set -a && source ../.env.staging && set +a
docker compose -f docker-compose.staging.yml up -d --build
```

> 回滚完成后可切回 `development` 分支：

```bash
git checkout development
```

### 回滚验证

**健康检查**

```bash
curl http://localhost:3001/api/health
```

- 返回结果：`{"status":"healthy","version":"4.3.0","timestamp":"2026-01-18T10:15:37.702Z","checks":{"database":{"status":"ok","latency":260},"redis":{"status":"ok","latency":1}}}`

**关键路径验证**

- `/api/health`：✅
- `/api/sessions`：✅
- `/api/auth/login`：✅
- `/api/reports/generate`：未单独测试（smoke test 已覆盖）

### 回滚结果

- 状态：✅ 通过
- 主要问题与处理：回滚过程顺利，需要重新应用构建修复（因为 git checkout 会恢复原始文件）

## 结论与改进项

- 结论摘要：staging 发布与回滚流程验证通过。手动流程可行，但存在需要修复的问题。
- 需要改进的环节：
  1. **@sentry/node 集成**：需要使用 @sentry/nextjs 或配置 webpack externals 来正确支持 GlitchTip 错误追踪
  2. **CI 环境变量**：deploy-staging 工作流需要确保 build args 正确传递
  3. **Smoke test 密码**：考虑创建专用的 smoke test 环境变量配置
- 后续行动项：
  - [ ] 修复 @sentry/node webpack 构建问题（TECHNICAL_DEBT）
  - [ ] 验证 CI deploy-staging 工作流
  - [ ] 部署 GlitchTip 和 Uptime Kuma

## 附件

- 关键日志片段：

```
# 健康检查日志
[Instrumentation] Initializing server-side services...
[AuditLogger] Initialized with log file: /var/log/goodman/audit.log
[Cleanup] Scheduled guest cleanup task (hourly at minute 0)
[Instrumentation] Cleanup scheduler started
[UserService] Admin account already exists
[Instrumentation] Admin account verified
[Instrumentation] Server-side initialization complete
[Redis] Connected successfully
```

- 截图/链接：N/A
