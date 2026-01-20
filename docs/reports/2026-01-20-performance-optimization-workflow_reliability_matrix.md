# v4.6 关键流程可靠性矩阵

本矩阵用于将“关键流程 → 成功判定 → 指标 → 验收步骤”一一对齐，作为 v4.6 稳定性验证的统一依据。

---

## 1. P0 关键流程（必须稳定）

| 流程 | 入口 API | 成功判定 | 关键日志字段 | 验收步骤 |
| --- | --- | --- | --- | --- |
| Chat 主流程 | `POST /api/chat/stream` | SSE 首 token 输出 + 完成事件；HTTP 200 | `workflow=chat_stream`、`step=start|success|failure`、`duration`、`errorType`、`requestId` | 发起一次含检索的提问，确认首 token < 3s、完成 < 12s，且返回完成事件 |
| 检索（文档 + 结构化） | `POST /api/chat/stream`（工具调用：`search_documents` / `query_financial_data`） | 检索返回结果或明确空结果提示 | `workflow=retrieval`、`step=success|failure`、`errorType` | 对示例数据发起检索，结果稳定可复现；空结果时有明确引导 |
| 文档提取 | `POST /api/documents/upload-temp` | 返回标准成功结构；提取结果可追踪 | `workflow=document_extraction`、`step=start|success|failure`、`duration`、`errorType` | 上传样本文件并完成提取，记录 requestId 与耗时 |
| 报告生成 | `POST /api/reports/generate` | SSE 完成事件输出；生成结果可保存 | `workflow=report_generation`、`step=start|success|failure`、`duration`、`errorType` | 触发报告生成并确认完成事件；失败时返回标准错误结构 |
| Quick Actions - Extract | `POST /api/quick-actions/extract` | 返回标准成功结构并包含提取结果 | `workflow=quick_action_extract`、`step=start|success|failure`、`duration`、`errorType` | 触发快速提取并返回结构化结果 |
| 管理员上传/配置 | `POST /api/admin/verify-password`、`POST /api/admin/upload-database-document` | 登录成功并写入会话；上传完成并入库 | `workflow=admin_auth`、`workflow=admin_upload`、`step`、`errorType` | 管理员登录成功后上传文件并完成结构化入库 |

---

## 2. P1 流程（低频/次要）

| 流程 | 入口 API | 成功判定 | 验收步骤 |
| --- | --- | --- | --- |
| 用户会话 | `GET/POST /api/sessions`、`GET/PUT /api/sessions/[id]` | 返回标准成功结构 | 创建/更新会话并返回 session 数据 |
| 认证会话 | `POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/session`、`GET /api/auth/csrf` | 正常返回或清晰错误 | 登录后读取 session，退出后 session 失效 |
| 文档列表/预览 | `GET /api/documents`、`POST /api/documents/preview-url`、`POST /api/documents/pdf-preview` | 列表/预览可正常返回 | 查询文档列表并生成预览链接 |
| 报告读取/保存 | `GET /api/reports`、`GET /api/reports/[id]`、`POST /api/reports/save`、`GET /api/reports/[id]/pdf` | 列表/报告可正常返回 | 保存报告后可被读取或导出 |
| 报告配置解析 | `POST /api/reports/parse-config` | 返回解析结果或澄清提示 | 输入配置意图并获得可用年份提示 |
| 财务数据年份 | `GET /api/financial-data/years` | 返回年份列表 | 返回示例年份列表 |
| 管理员统计/会话 | `GET /api/admin/stats`、`GET /api/admin/sessions` | 返回统计或会话数据 | 管理后台拉取统计与会话 |
| 本地文档索引 | `GET /api/local-documents` | 返回索引信息 | 返回本地文档索引列表 |
| 健康检查 | `GET /api/health` | 返回健康状态 | 健康检查返回 OK |

---

## 3. 指标口径与采样规则

- **采样周期**：≥ 7 天或 ≥ 200 请求（取较高者）。
- **成功率**：流程完成并返回预期成功响应（SSE 需包含完成事件）。
- **错误率**：HTTP 5xx / 总请求。
- **P95**：基于日志字段 `duration` 计算。
- **与 v4.4 观测对接**：使用现有 `logger`/`logRequest`/`logError` 结构化日志与 `requestId` 贯穿，由 v4.4 观测系统采集并汇总。

---

## 4. 指标映射表（P0）

| 流程 | workflow 字段 | 指标名称 | 阈值 | 失败归因字段 |
| --- | --- | --- | --- | --- |
| Chat 主流程 | `chat_stream` | `chat.success_rate` / `chat.p95_first_token` / `chat.p95_total` | 成功率 ≥ 98%；首 token < 3s；总耗时 < 12s | `errorType` |
| 检索 | `retrieval` | `retrieval.success_rate` / `retrieval.p95` | 成功率 ≥ 98%；P95 < 1s（非 AI） | `errorType` |
| 文档提取 | `document_extraction` | `extraction.success_rate` / `extraction.p95` | 成功率 ≥ 98%；P95 < 45s | `errorType` |
| 报告生成 | `report_generation` | `report.success_rate` / `report.p95` | 成功率 ≥ 98%；P95 < 60s | `errorType` |
| Quick Actions - Extract | `quick_action_extract` | `quick_action.success_rate` / `quick_action.p95` | 成功率 ≥ 98%；P95 < 1s（非 AI） | `errorType` |
| 管理员上传/配置 | `admin_auth` / `admin_upload` | `admin.success_rate` / `admin.p95` | 成功率 ≥ 98%；P95 < 5s（非 AI） | `errorType` |
