# 架构总览（Architecture）

本文档提供 Project Goodman 的系统架构与数据流概览，面向生产运维与可信展示需求。

## 1. 架构概览

### 1.1 部署拓扑（ASCII）

```
+----------------------------+
|         GitHub CI          |
|  ci / deploy-staging/prod  |
+-------------+--------------+
              |
              | SSH
              v
+----------------------------------------------+
|                    VPS                       |
|                                              |
|  prod: 3000                                  |
|  +-------------------------------+           |
|  |        Next.js App            |           |
|  |      project-goodman          |           |
|  +---------------+---------------+           |
|                  |                           |
|             +----v----+                      |
|             |  Redis  |                      |
|             +---------+                      |
|                                              |
|  staging: 3001                               |
|  +-------------------------------+           |
|  |     Next.js App (staging)     |           |
|  +---------------+---------------+           |
|                  |                           |
|             +----v----+                      |
|             |  Redis  |                      |
|             +---------+                      |
+-------------------+--------------------------+
            |                     |
            | HTTPS               | HTTPS
            v                     v
+------------------+   +-----------------------+
|    Supabase      |   | Sentry/UptimeRobot    |
| Postgres/Storage |   |   (SaaS Observability)|
+------------------+   +-----------------------+
```

### 1.2 关键边界

- **安全边界**：Next.js API routes 是唯一对外入口，所有数据库访问走 server 端。
- **数据边界**：staging 与 production 使用独立环境与数据源，避免误写。
- **可观测性边界**：错误追踪与健康监控通过 SaaS 提供。

---

## 2. 核心组件

| 组件 | 作用 | 说明 |
|------|------|------|
| Next.js App Router | Web/API 层 | 页面渲染 + API routes + SSE 流式输出 |
| LangGraph | Agent 编排 | 工具调用、报告生成、过程日志 |
| Supabase Postgres | 数据存储 | 文档元数据、结构化财务数据 |
| Supabase Storage | 文件存储 | 原始上传文件与解析结果 |
| Redis | 会话/限流 | 会话状态、速率限制、缓存 |
| Sentry | 错误追踪 | 服务器端异常上报（过滤敏感信息） |
| UptimeRobot | 监控告警 | 健康检查监控与告警 |

---

## 3. 关键数据流

### 3.1 文档上传与解析

1. 用户上传文件 → `/api/documents/upload-temp`
2. 服务端解析文本、生成分块
3. 原始文件写入 Supabase Storage
4. 元数据与分块写入 Supabase Postgres
5. 返回文档 metadata 与引用链接

### 3.2 对话与报告生成

1. 用户输入 → `/api/chat/stream`
2. LangGraph 选择工具（结构化数据/文档检索/计算）
3. 过程日志事件写入 SSE 流
4. 输出最终答案或报告

### 3.3 健康检查

1. CI/监控调用 `/api/health`
2. 检测应用基本状态与版本
3. 结果用于部署门禁与告警

---

## 4. 运行环境与配置

- **Production**：端口 3000，目录 `/home/deploy/goodman/project-goodman`
- **Staging**：端口 3001，目录 `/home/deploy/goodman-staging/project-goodman`
- **配置管理**：`.env` / `.env.staging`

---

## 5. 依赖与外部服务

- **OpenAI API**：LLM 推理与生成
- **Supabase**：数据库与存储
- **可观测性**：Sentry + UptimeRobot（SaaS）

---

## 6. 变更与演进

- 架构变更需更新本文件与 `docs/SECURITY.md`
- 发布前验证流程见 `docs/DEPLOYMENT_CHECKLIST.md`
