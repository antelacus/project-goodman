# v4.4 生产就绪 - Phase 3-5 实施跟踪

## 概述

本文档跟踪 v4.4 生产就绪的实施进度与测试结果。

---

## 实施任务清单

### A. Staging 环境

#### Task A1: 建立 staging 目录与 compose

**状态**: ✅ 完成

- [x] 创建 `$GOODMAN_STAGING_DIR/` 目录结构
- [x] 新增 `docker-compose.staging.yml`（app + redis）
- [x] 端口绑定到 3001

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 09:10
完成时间: 2026-01-17 09:25
变更点:
- 新增 docker-compose.staging.yml（app + redis + 3001 端口）
- 创建 $GOODMAN_STAGING_DIR/project-goodman 目录
备注: staging 仅绑定 127.0.0.1，避免外网直连
```

---

#### Task A2: 环境变量与数据隔离

**状态**: ✅ 完成

- [x] 新增 `.env.staging` 模板
- [x] staging 使用独立 Supabase 项目或 schema
- [x] redis 与生产隔离（独立容器）

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 09:30
完成时间: 2026-01-17 09:40
变更点:
- 新增 .env.staging.example，明确 staging Supabase 需独立项目或隔离 schema
- Redis 使用 goodman-redis-staging 容器，避免与生产混用
备注: 实际部署需将模板复制为 $GOODMAN_STAGING_DIR/.env.staging
```

---

### B. CI/CD 与发布前验证

#### Task B1: deploy-staging 工作流

**状态**: ✅ 完成

- [x] 新增 `.github/workflows/deploy-staging.yml`
- [x] 使用独立 secrets（STAGING_HOST/USER/KEY）
- [x] 完成健康检查验证

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 12:24
完成时间: 2026-01-17 12:25
变更点:
- 新增 deploy-staging 工作流，development 分支自动部署
- 健康检查切换为 staging 端口 3001
备注: staging 部署目录为 $GOODMAN_STAGING_DIR/project-goodman
```

---

#### Task B2: 冒烟测试脚本

**状态**: ✅ 完成

- [x] 新增冒烟测试脚本（health/sessions/auth/reports）
- [x] 在 deploy-staging 中执行
- [x] 失败阻断流程

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 12:26
完成时间: 2026-01-17 12:31
变更点:
- 新增 scripts/smoke-test-staging.js（health/sessions/auth/reports）
- deploy-staging 中新增冒烟测试步骤
备注: 报告生成使用真实 SSE 流完成事件作为通过标准
```

---

### C. 可观测性

#### Task C1: GlitchTip 自托管

**状态**: ✅ 完成

- [x] 添加 GlitchTip 部署配置（含所需依赖）
- [x] 配置持久化存储
- [x] 记录部署与访问方式

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 13:05
完成时间: 2026-01-17 13:25
变更点:
- 新增 docker-compose.observability.yml（GlitchTip + Postgres + Redis + migrate/worker）
- 新增 .env.observability.example（含 GLITCHTIP_ALLOWED_HOSTS）
- 新增 docs/OBSERVABILITY.md（部署与访问说明）
备注: docker compose config 验证通过（使用本地 .env.observability 临时副本）
```

---

#### Task C2: Uptime Kuma

**状态**: ✅ 完成

- [x] 添加 Uptime Kuma 容器配置
- [x] 配置 prod/staging 健康检查
- [x] 告警渠道文档化

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 13:30
完成时间: 2026-01-17 13:40
变更点:
- docker-compose.observability.yml 增加 uptime-kuma 服务与持久化卷
- docs/OBSERVABILITY.md 补充访问地址与监控/告警配置
备注: 监控项使用 /api/health（prod/staging）
```

---

#### Task C3: 错误追踪接入

**状态**: ✅ 完成

- [x] 仅 server 端接入 GlitchTip DSN
- [x] 过滤敏感字段
- [x] 与 `requestId` 日志关联

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-17 13:45
完成时间: 2026-01-17 14:05
变更点:
- 新增 src/lib/observability/error-tracking.ts（server-only 初始化 + sanitize）
- error-handler 在 5xx 时上报 GlitchTip（含 requestId/route tag）
- instrumentation 启动时初始化错误追踪
- 新增 tests/unit/observability 与 tests/unit/security 覆盖
- vitest 增加 server-only stub alias
- .env.staging.example 增加 GlitchTip 配置项
备注: sanitizeEvent 会移除 request/user 并脱敏敏感字段
```

---

### D. 测试体系补齐

#### Task D1: 集成测试

**状态**: ✅ 完成

- [x] 增加集成测试基础设施
- [x] 覆盖 `/api/chat` 或 `/api/chat/stream`
- [x] 覆盖 `/api/reports/generate`
- [x] 覆盖 `/api/documents/upload-temp`

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-18 00:40
完成时间: 2026-01-18 00:59
变更点:
- 新增 tests/integration/api 下的 API 集成测试（chat-stream/reports-generate/upload-temp）
- 使用模块 mock 隔离外部依赖（安全模块、工作流、OpenAI、Supabase）
- SSE 流测试采用流读取方式，验证 complete/report 事件输出
验证:
- npm run test -- --run tests/integration/api/chat-stream.test.ts tests/integration/api/reports-generate.test.ts tests/integration/api/upload-temp.test.ts
备注: 集成测试默认使用 Node 环境，避免 JSDOM 对 ReadableStream 的限制
```

---

#### Task D2: E2E 测试

**状态**: ✅ 完成

- [x] 接入 Playwright
- [x] 编写 1-2 条关键路径测试
- [x] CI 运行（初期 non-blocking）

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-18 02:10
完成时间: 2026-01-18 02:25
变更点:
- 新增 Playwright 配置与测试脚本（tests/e2e/landing-to-chat.spec.ts）
- 增加 playwright.config.ts，E2E 走本地 dev server
- CI 中加入 Playwright 安装 + E2E（non-blocking）
测试:
- npm run test:e2e ✅ (1 passed)
备注: CI 需要 Playwright 浏览器安装步骤
```

---

#### Task D3: 覆盖率门槛

**状态**: ⏳ 待办

- [ ] 配置 `npm run test:coverage`
- [ ] 设置初始覆盖率阈值（60%）
- [ ] CI 输出覆盖率报告

---

### E. 文档与运维

#### Task E1: 架构总览文档

**状态**: ⏳ 待办

- [ ] 新增 `docs/ARCHITECTURE.md`
- [ ] 描述系统架构与数据流

---

#### Task E2: 安全文档

**状态**: ⏳ 待办

- [ ] 新增 `docs/SECURITY.md`
- [ ] 说明认证/授权边界、密钥策略、披露流程

---

#### Task E3: 事故响应手册

**状态**: ⏳ 待办

- [ ] 新增 `docs/INCIDENT_RUNBOOK.md`
- [ ] 记录分级与响应流程

---

#### Task E4: 发布清单更新

**状态**: ⏳ 待办

- [ ] 更新 `docs/DEPLOYMENT_CHECKLIST.md`
- [ ] 增加 staging 验证、冒烟测试、观测检查

---

### F. 发布与回滚演练

#### Task F1: staging 演练记录

**状态**: ⏳ 待办

- [ ] 记录发布、回滚、验证步骤
- [ ] 归档到文档中

---

## Phase 5 测试清单（全部任务完成后）

- [ ] `npm run lint` 通过
- [ ] `npm run build` 通过
- [ ] `npm run test -- --run` 通过
- [ ] `npm run test:coverage` 生成报告
- [ ] 集成测试通过
- [ ] E2E 测试通过
- [ ] staging 冒烟测试通过
- [ ] 更新本 TRACK 测试记录
