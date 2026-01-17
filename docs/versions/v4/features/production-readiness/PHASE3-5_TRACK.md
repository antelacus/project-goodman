# v4.4 生产就绪 - Phase 3-5 实施跟踪

## 概述

本文档跟踪 v4.4 生产就绪的实施进度与测试结果。

---

## 实施任务清单

### A. Staging 环境

#### Task A1: 建立 staging 目录与 compose

**状态**: ⏳ 待办

- [ ] 创建 `/home/deploy/goodman-staging/` 目录结构
- [ ] 新增 `docker-compose.staging.yml`（app + redis）
- [ ] 端口绑定到 3001

---

#### Task A2: 环境变量与数据隔离

**状态**: ⏳ 待办

- [ ] 新增 `.env.staging` 模板
- [ ] staging 使用独立 Supabase 项目或 schema
- [ ] redis 与生产隔离（独立容器）

---

### B. CI/CD 与发布前验证

#### Task B1: deploy-staging 工作流

**状态**: ⏳ 待办

- [ ] 新增 `.github/workflows/deploy-staging.yml`
- [ ] 使用独立 secrets（STAGING_HOST/USER/KEY）
- [ ] 完成健康检查验证

---

#### Task B2: 冒烟测试脚本

**状态**: ⏳ 待办

- [ ] 新增冒烟测试脚本（health/sessions/auth/reports）
- [ ] 在 deploy-staging 中执行
- [ ] 失败阻断流程

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

