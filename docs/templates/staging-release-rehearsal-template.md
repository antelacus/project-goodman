# Staging 发布/回滚演练记录（模板）

> 目标：验证 staging 发布流程、健康检查、冒烟测试与回滚流程可复现。

## 基本信息

- 日期：【待填写】
- 演练环境：staging（http://localhost:3001）
- 执行人：【待填写】
- 关联分支/提交：`【待填写】`
- 关联 CI 运行链接：【待填写】
- 演练窗口：【开始-结束时间】

## 预备条件

- [ ] staging 环境可访问
- [ ] `/api/health` 返回 200
- [ ] `.env.staging` 已配置且不含生产密钥
- [ ] GlitchTip/Uptime Kuma 正常
- [ ] 已确认回滚目标（commit/tag/时间点）

## 发布演练

### 方式

- [ ] CI 自动（deploy-staging 工作流）
- [ ] 手动执行

### 发布步骤记录

1. 【步骤说明】
2. 【步骤说明】

手动参考命令（如适用）：

```bash
cd $GOODMAN_STAGING_DIR/project-goodman

docker compose -f docker-compose.staging.yml up -d --build
```

### 发布验证

**健康检查**

```bash
curl http://localhost:3001/api/health
```

- 返回结果：`【待填写】`

**冒烟测试**

```bash
SMOKE_BASE_URL=http://localhost:3001 \
SMOKE_ENV_FILE=$GOODMAN_STAGING_DIR/.env.staging \
node scripts/smoke-test-staging.js
```

- 执行结果：`【待填写】`
- 失败接口（如有）：【待填写】

### 发布结果

- 状态：✅ 通过 / ❌ 失败
- 主要问题与处理：【待填写】

## 回滚演练

### 触发原因/条件

- 【待填写】

### 回滚目标

- commit/tag：`【待填写】`
- 预期恢复版本：`【待填写】`

### 回滚步骤

1. 【步骤说明】
2. 【步骤说明】

手动参考命令（如适用）：

```bash
cd $GOODMAN_STAGING_DIR/project-goodman

git checkout 【回滚提交】

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

- 返回结果：`【待填写】`

**关键路径验证**

- `/api/health`：✅/❌
- `/api/sessions`：✅/❌
- `/api/auth/login`：✅/❌
- `/api/reports/generate`：✅/❌

### 回滚结果

- 状态：✅ 通过 / ❌ 失败
- 主要问题与处理：【待填写】

## 结论与改进项

- 结论摘要：【待填写】
- 需要改进的环节：【待填写】
- 后续行动项：【待填写】

## 附件

- 关键日志片段：【待填写】
- 截图/链接：【待填写】
