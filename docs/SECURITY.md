# 安全说明（Security）

本文档描述 Project Goodman 的安全边界、密钥管理与漏洞披露流程，用于生产就绪展示与内部对齐。

## 1. 安全边界与威胁模型

### 1.1 安全边界

- **核心边界**：Next.js API routes 是唯一对外入口。
- **数据库访问**：仅 server 端使用 Service Role Key，客户端不直连数据库。
- **RLS 角色**：数据库 RLS 作为防御加深层，非主安全边界。

### 1.2 威胁模型（简要）

- 未授权访问 API 与敏感数据
- 密钥泄露或环境变量误配置
- 客户端注入与恶意输入
- 日志/追踪中泄漏敏感字段

---

## 2. 认证与授权

- **认证方式**：访客进入即分配访客会话；账户以用户名与密码登录（bcrypt hash），会话按账户角色发放。管理员上传资料库文档另需再次输入管理员密码。
- **归属**：会话、选中文档与按 ID 读取的文档都核对归属，别人的与不存在的一样返回 404（`src/lib/documents/access.ts`）。
- **会话存储**：Redis（支持限流与会话状态）。
- **会话安全**：禁止在 localStorage/sessionStorage 存储敏感信息，使用 HttpOnly Cookie。

---

## 3. 密钥与配置管理

- **环境变量集中管理**：`.env` / `.env.staging`
- **密钥隔离**：staging 与 production 各用一把 Supabase secret 密钥，但连同一个 Supabase 项目（隔离方案属发布流水线）
- **数据库密钥**：只有服务端的 `createServerSupabaseClient()` 读 `SUPABASE_SECRET_KEY`，缺失即报错；旧的 anon / service_role 密钥已停用，`anon` 在数据库中没有任何权限（`.claude/rules/code-conventions.md` Database Security）
- **密钥轮换**：建议在发布前后进行周期轮换，并同步更新部署配置

---

## 4. 数据保护与输入校验

- **输入校验**：所有外部输入使用 Zod schema 校验
- **错误响应**：统一通过 `createErrorResponse()` 输出
- **敏感信息处理**：错误追踪与日志过滤 token/secret/password 字段
- **日志最小化**：记录结果与 requestId，避免记录原始敏感数据

---

## 5. 可观测性与审计

- **错误追踪**：Sentry（仅 server 端启用）
- **健康监控**：UptimeRobot 监控 `/api/health`
- **审计基线**：CI 中执行依赖安全审计与质量门禁

---

## 6. 漏洞披露与响应流程

如发现安全漏洞，请通过 GitHub 仓库的 **Security → Report a vulnerability**（私密漏洞报告）提交，不要开公开 issue。期望 24–48 小时内确认。

响应流程：

1. 评估影响范围与严重级别
2. 规划修复与回滚策略
3. 发布修复版本并补充公告（如需）
4. 更新 `docs/INCIDENT_RUNBOOK.md` 与 `CHANGELOG.md`

---

## 7. 变更记录

- 安全边界或鉴权策略变更需同步更新本文件
- 与部署相关的安全检查详见 `docs/DEPLOYMENT_CHECKLIST.md`
