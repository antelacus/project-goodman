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

**状态**: ⏳ 待办

- [ ] 添加 GlitchTip 部署配置（含所需依赖）
- [ ] 配置持久化存储
- [ ] 记录部署与访问方式

---

#### Task C2: Uptime Kuma

**状态**: ⏳ 待办

- [ ] 添加 Uptime Kuma 容器配置
- [ ] 配置 prod/staging 健康检查
- [ ] 告警渠道文档化

---

#### Task C3: 错误追踪接入

**状态**: ⏳ 待办

- [ ] 仅 server 端接入 GlitchTip DSN
- [ ] 过滤敏感字段
- [ ] 与 `requestId` 日志关联

---

### D. 测试体系补齐

#### Task D1: 集成测试

**状态**: ⏳ 待办

- [ ] 增加集成测试基础设施
- [ ] 覆盖 `/api/chat` 或 `/api/chat/stream`
- [ ] 覆盖 `/api/reports/generate`
- [ ] 覆盖 `/api/documents/upload-temp`

---

#### Task D2: E2E 测试

**状态**: ⏳ 待办

- [ ] 接入 Playwright
- [ ] 编写 1-2 条关键路径测试
- [ ] CI 运行（初期 non-blocking）

---

#### Task D3: 覆盖率门槛

**状态**: ✅ 完成

- [x] 配置 `npm run test:coverage`
- [x] 设置初始覆盖率阈值（60%）
- [x] CI 输出覆盖率报告

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-18 02:45
完成时间: 2026-01-18 02:48
变更点:
- vitest.config.ts 添加 coverage 配置与 60% 门槛
- CI 增加 test:coverage + 覆盖率报告上传
- 补齐 dupont_roe 错误分支与非 Error 抛出覆盖测试
备注: 覆盖率基线达成（Branches 60%+，整体 70%+）
```

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
