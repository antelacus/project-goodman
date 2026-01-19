# v4.4 生产就绪 - Phase 2 设计文档

## 概述

| 属性 | 详情 |
|------|------|
| **功能名称** | 生产就绪 (Production Readiness) |
| **版本** | v4.4 |
| **状态** | Phase 2 - 设计完成 |
| **Phase 1 文档** | [PHASE1_REQ.md](./PHASE1_REQ.md) |

---

## 设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| Staging 部署 | 同一 VPS + 独立目录/端口/环境变量 | 零成本、隔离清晰、易回滚 |
| 可观测性 | Sentry（SaaS）+ UptimeRobot（SaaS） | 免运维成本、接入快、免费额度可用 |
| E2E 工具 | Playwright | headless 友好，CI 支持成熟 |
| 覆盖率门槛 | 初始 60% 基线 | 现实可达，便于逐步提高 |
| 发布验证 | 健康检查 + 冒烟脚本 | 覆盖关键路径，成本低 |

---

## 1. 架构概览

### 1.1 部署拓扑

```
                 ┌─────────────────────────┐
                 │        GitHub CI        │
                 │  deploy-staging / prod  │
                 └────────────┬────────────┘
                              │ SSH
              ┌───────────────┴────────────────┐
              │              VPS               │
              │                                │
              │  prod: 3000                     │
              │  ├─ goodman (Next.js)           │
              │  └─ redis                       │
              │                                │
              │  staging: 3001                  │
              │  ├─ goodman-staging (Next.js)   │
              │  └─ redis-staging               │
              └────────────────────────────────┘
                              │ HTTPS
                    ┌─────────┴─────────┐
                    │      SaaS         │
                    │  Sentry/UptimeRobot │
                    └───────────────────┘
```

### 1.2 数据源隔离

- staging 使用独立 Supabase 项目或隔离 schema。
- staging 不可写入生产数据。
- Redis 使用独立容器，避免 key 交叉。

---

## 2. 组件设计

### 2.1 Staging 环境

- 新目录：`/home/deploy/goodman-staging/`
- 新端口：`3001`
- 新 env：`.env.staging`
- 新 compose：`docker-compose.staging.yml`（含 app + redis）

### 2.2 CI/CD 工作流

- `deploy-staging.yml`：development 分支 → staging 部署 → health check → 冒烟测试
- `deploy.yml`：main 分支 → production 部署 → health check

### 2.3 冒烟测试脚本

- 目标接口：`/api/health`、`/api/sessions`、`/api/auth/login`、`/api/reports/generate`
- 以最小依赖方式执行（curl + node 脚本）
- 失败即阻断 staging 验证

### 2.4 错误追踪与监控

**Sentry**：
- 仅在 server 端启用
- 上报字段过滤（password/token/secret）
- 复用 `requestId` 关联日志

**UptimeRobot**：
- 监控 prod `/api/health`
- 告警渠道记录在文档中（邮件/IM）
- staging 需配置公网域名后再接入

---

## 3. 数据流与错误处理

### 3.1 staging 部署流

1. `development` 推送触发 deploy-staging
2. 远程拉取代码并重建容器
3. 运行健康检查
4. 执行冒烟测试

### 3.2 运行时错误处理

- API 统一使用 `createErrorResponse()`
- Sentry 捕获未处理异常并上报
- 禁止敏感信息上报

---

## 4. 测试策略

### 4.1 集成测试

- 使用 Vitest 直接调用 route handler
- 需配置测试环境变量
- 重点覆盖 3 条关键 API 路径

### 4.2 E2E 测试

- Playwright 运行 1-2 条用户流程
- 结果可在 CI 中运行（初期非阻断）

### 4.3 覆盖率门槛

- `npm run test:coverage` 输出报告
- 设定 60% 基线并在 CI 可见

---

## 5. 迁移与发布策略

### 5.1 迁移步骤

1. 接入 Sentry/UptimeRobot
2. 建立 staging 环境
3. 接入错误追踪与冒烟测试
4. 增量补齐集成/E2E 测试
5. 更新文档与发布清单

### 5.2 回滚策略

- staging 故障不影响生产
- 生产回滚遵循 `docs/DEPLOYMENT_CHECKLIST.md`
- Sentry/UptimeRobot 可独立停用

---

## 6. 安全影响评估

- 新增第三方 SaaS 服务，需评估数据出站与合规要求
- 需保证 Sentry 日志过滤敏感字段
- staging 必须与生产隔离，避免误写

---

## 7. 文档输出清单

- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`
- `docs/INCIDENT_RUNBOOK.md`
- 更新 `docs/DEPLOYMENT_CHECKLIST.md`
