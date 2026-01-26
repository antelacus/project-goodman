# 更新日志 (Changelog)

> **文档用途**: 记录每个版本的用户可见变更。从用户角度描述"改变了什么"，而非"如何实现"。
> 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式。
>
> | 读者 | 更新频率 | 相关文档 |
> |------|----------|----------|
> | 用户、利益相关者 | 每次发布 | README (功能介绍), TRACK (实现细节) |

本文件记录项目的所有重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

*暂无*

---

## [4.6.0] - 2026-01-26

### 新增

- **报告输出格式调整**: 报告生成默认输出 DOCX 格式，便于用户二次编辑；保留历史 PDF 兼容
- **报告生成上下文增强**: 注入公司档案与财务制度，LLM 分析结合公司特性（IDM 模式、行业基准、内部标准）
- **Agent 工具测试与修复**: 70 题 Agent 测试脚本，修复财务指标别名、文档搜索、系统提示词等问题
- **财务校验规则强化**: 新增 16 条财务校验规则（利润表净利润以下、现金流投资/筹资小计），全部作为阻断性错误

### 变更

- **可靠性矩阵**: 建立 P0/P1 关键流程清单与验收标准，明确成功率/错误率/P95 指标口径
- **错误分类统一**: 定义统一错误分类枚举与结构化日志契约，P0 路由日志补齐
- **UI 文案优化**: Landing/Login/Chat/About/Help 页面文案重写，移除过度承诺与装饰性动效
- **Help 页面重构**: 面向普通用户，核心能力概览、使用示例、常见问题 FAQ
- **About 页面重构**: 面向技术人员，技术栈标签、核心技术特性、支持的文档类型

### 修复

- **报告指标格式化**: 百分比统一两位小数，货币指标千分位 + 万元单位
- **DOCX 上期格式化**: 表格上期数值使用统一格式化逻辑
- **报表小屏可读性**: 表格固定最小宽度并支持横向滚动
- **文档搜索 search_path**: 修复 `search_documents_hybrid` 函数 pgvector 操作符问题

---

## [4.5.0] - 2026-01-20

### 新增

- **质量门禁基线**: 引入 Lighthouse CI、A11y(axe)、性能基线(autocannon)与安全审计门禁，CI 对评分回归/违规/延迟退化/高危漏洞阻断
- **性能阈值与告警**: Sentry Performance 关键 API 事务命名与阈值配置，告警策略文档化
- **开发者入口**: README 增加技术栈、环境变量、本地运行与测试命令

### 变更

- **运维与文档一致性**: OBSERVABILITY/DEPLOYMENT_CHECKLIST/CLAUDE 更新以对齐当前依赖与门禁

---

## [4.4.0] - 2026-01-19

### 新增

- **Staging 环境与自动化验证**: `development` 推送自动部署 staging，包含健康检查与冒烟测试（health/auth/sessions/reports）
- **测试体系补齐**: 新增关键 API 集成测试、Playwright E2E 核心流程与覆盖率基线报告
- **可观测性**: 接入 Sentry 错误追踪（仅 server 端）与 UptimeRobot 健康检查监控
- **运维文档**: 新增 ARCHITECTURE/SECURITY/INCIDENT_RUNBOOK，并更新部署清单

### 变更

- **覆盖率门槛**: CI 覆盖率阈值调整为与当前基线一致（Lines 56 / Statements 56 / Branches 40 / Functions 62）
- **可观测性方案**: 从自托管 GlitchTip/Uptime Kuma 切换为 SaaS（Sentry + UptimeRobot）

### 修复

- **Edge 构建兼容性**: 拆分 request-id 生成逻辑，避免 edge middleware 引入 `@sentry/node` 依赖导致构建失败

---

## [4.3.0] - 2026-01-17

### 新增

- **健康检查端点**: 新增 `/api/health` 用于服务状态验证
- **健壮性与可访问性**: 增加 Error Boundary、模态框焦点管理与键盘支持
- **加载体验**: 引入骨架屏加载状态（会话列表、消息、文档选择）

### 变更

- **依赖与框架升级**: Next.js 升级到 15.5+，expr-eval → mathjs、xlsx → exceljs
- **CI/CD 与测试**: 添加 Vitest 测试框架与预提交钩子，CI 流水线覆盖 lint/test/build
- **可观测性**: 增加结构化日志、Web Vitals 基线记录

### 修复

- **侧边栏会话同步**: 新建会话立即显示
- **过程日志来源链接**: 支持 PDF 预览直达
- **报告生成时间**: `reports.generation_time_ms` 正确写入
- **页面文案**: About 页版本信息与多处文案一致性修复

---

## [4.2.1] - 2026-01-12

### 修复

- **报告生成 Docker 部署问题**: 修复生产环境中 prompt 模板文件未包含在 Docker 镜像中的问题
  - 在 Dockerfile 中添加 `src/lib/prompts/` 目录的复制步骤

- **报告生成进度条消失问题**: 修复生成过程中发生错误时进度条立即消失、无法显示错误信息的问题
  - 进度条现在在出错时保持显示，并展示错误详情

- **CSP 阻止 Cloudflare Analytics**: 更新 Content Security Policy 以允许 Cloudflare Web Analytics
  - `script-src` 添加 `https://static.cloudflareinsights.com`
  - `connect-src` 添加 `https://cloudflareinsights.com`

---

## [4.2.0] - 2026-01-12

### 新增

#### 报告生成系统 (Report Generation)

**目标**: 使用现有 21 个财务指标生成结构化综合财务分析报告，展示 AI Agent 的编排能力。

- **综合财务分析报告**: 自动生成包含 5 大分析章节的专业报告
  - 流动性分析（5 指标）
  - 偿债能力分析（7 指标）
  - 盈利能力分析（4 指标）
  - 运营效率分析（5 指标）
  - 综合评价与建议（杜邦分析）

- **对话式配置**: 自然语言配置报告参数
  - 点击「工具 > 生成报告」启动
  - 支持年份选择、对比年份配置
  - Agent 智能解析用户意图（如"改成2023年"、"不要对比"）

- **实时生成进度**: SSE 流式显示生成过程
  - 4 阶段进度：检查数据 → 收集指标 → 分析数据 → 生成报告
  - 章节完成实时反馈

- **报告展示**: 在聊天区域渲染完整报告
  - 执行摘要（关键发现、风险警示、建议）
  - 可折叠章节，指标表格含同比变化
  - 数据来源文档链接

- **PDF 导出**: 生成专业 PDF 报告
  - 中文字体支持 (Noto Sans SC)
  - 专业蓝色调配色方案
  - 自动保存到 Supabase Storage

- **报告管理**: 文档页面查看历史报告
  - 报告列表展示
  - PDF 下载功能

**技术实现**:
- LangGraph 独立工作流（与统一工作流解耦）
- 并行执行 21 个预设财务工具
- GPT-4o 生成章节分析文字
- `@react-pdf/renderer` 生成 PDF
- 新增 `reports` 数据库表

**API 端点**:
- `POST /api/reports/generate` - SSE 流式生成
- `POST /api/reports/save` - 保存报告 + PDF
- `GET /api/reports` - 报告列表
- `GET /api/reports/[id]` - 单个报告
- `GET /api/reports/[id]/pdf` - PDF 下载 URL
- `POST /api/reports/parse-config` - 意图解析
- `GET /api/financial-data/years` - 可用年份

---

## [4.1.0] - 2026-01-08

### 变更

#### 工具体系精简 (Tool Rationalization)

**目标**: 整合冗余工具，明确工具边界，提升 Agent 工具选择准确性。

- **增强 `query_financial_data` 工具**:
  - 支持多年份查询：`year` 参数改为 `years` 数组
  - 新输出格式：`{ results: [], missing: [] }` 扁平列表结构
  - 明确返回缺失指标，便于 Agent 决策

- **移除冗余工具**:
  - 删除 `get_financial_metric`（功能合并到 `query_financial_data`）
  - 删除 `calculate_financial_metric`（22 个预设工具已覆盖此场景）

- **System Prompt 增强**:
  - 添加工具选择决策树，指导 Agent 选择正确工具
  - 添加约束规则，防止 Agent 绕过预设工具手动计算
  - 列出 22 个预设财务比率工具名称

**工具数量**: 29 → 27（减少 2 个冗余工具）

**技术实现**:
- 修改 `src/lib/tools/types.ts` - Schema 更新
- 修改 `src/lib/tools/financial/utility-tools.ts` - 工具实现
- 修改 `src/lib/workflows/unified/prompts.ts` - System Prompt
- 新增 `tests/unit/query-financial-data.test.ts` - 单元测试

---

## [4.0.0] - 2026-01-08

### 新增

#### Agent 过程透明化 (Process Transparency)

**目标**: 建立用户信任 —— 财务工作要求高精度，用户必须能够验证 Agent 执行的每一步操作。

- **过程可视化组件**: 新增 `ProcessLog` 组件，在 AI 回复下方显示可折叠的工作过程
  - 🤔 思考/推理步骤
  - 🔧 工具调用（含参数）
  - ✅ 工具执行结果
  - ❌ 错误信息（红色高亮）

- **数据溯源**: 所有财务计算显示数据来源链接
  - 链接包含文档类型、年份、期间
  - 点击可跳转到文档管理页面

- **SSE 事件增强**: `/api/chat/stream` 端点新增 `process` 事件类型
  - 实时推送 Agent 工作进度
  - 支持工具调用、结果、错误事件

- **安全修复**: 移除错误事件中的堆栈跟踪，防止信息泄露

**技术实现**:
- 新增 `src/types/process-events.ts` 类型定义
- 新增 `src/lib/workflows/shared/format-event.ts` 事件格式化
- 新增 `src/components/chat/ProcessLog.tsx` UI 组件
- 修改 `src/hooks/useStreamingChat.ts` 处理 process 事件
- 修改 `src/app/api/chat/stream/route.ts` 发送 process 事件

---

## [3.11.0] - 2026-01-07

### 重构

#### 类型系统改进

**目标**: 系统性减少代码库中的 `as any` 类型断言，提升类型安全性和代码可维护性。

- **类型基础设施**: 新增 `database.types.ts` (自动生成)、`custom-types.ts` (自定义扩展)、`helpers.ts` (类型安全查询助手)
- **Supabase 类型修复**: 移除 18 处 Supabase 查询链上的 `as any`，使用类型推断和显式类型注解
- **LangGraph 状态类型**: 新增 `state-accessors.ts` 提供类型安全的状态访问，移除 8 处 `as any`
- **对话记忆类型**: 添加 `DbToolCall` 接口和转换函数，修复消息角色类型
- **提取结果类型**: 统一财务提取结果类型定义，移除 6 处 `as any`

**最终指标**:
| 指标 | 初始 | 目标 | 最终 |
|------|------|------|------|
| `as any` 总数 | 44 | ≤15 | 8 |
| 带 REASON 注释 | 0% | 100% | 100% |
| TypeScript 错误 | 0 | 0 | 0 |

**剩余 `as any` (8 处)**:
- XLSX 库 (6): 外部库返回 `unknown[]`，系统边界类型断言
- Zod 内部 API (2): `_def` 属性访问用于 schema 内省

---

## [3.9.0] - 2026-01-06

### 安全增强

#### P0 紧急修复
- **CSP 加固**: 移除 `unsafe-eval`，防止动态代码执行攻击
- **敏感数据清理**: 移除 localStorage/sessionStorage 中的敏感数据存储
- **Service Role 隔离**: 添加运行时检查防止客户端意外导入服务端模块
- **日志脱敏**: 移除日志中的 session token 片段

#### P1 API 层加固
- **CSRF 保护**: 实现 Double Submit Cookie 模式，保护所有状态变更操作
- **错误处理统一**: 所有 API 使用 `createErrorResponse()` 标准化响应
- **Zod 验证补全**: 为 chat、extract、documents 等 API 添加输入验证

### 修复

#### Agent 工作流修复
- **消息转换**: 正确处理 LangChain ↔ OpenAI 消息格式转换
- **JSON.parse 安全**: 添加 try-catch 防止工具参数解析失败导致崩溃
- **历史消息加载**: 修复 `tool_calls` 和 `tool_call_id` 从数据库恢复

#### 数据库修复
- **临时文档清理**: 更新清理函数使用 V3.10 所有权模型 (`owner_type` + `expires_at`)
- **类型同步**: 完善 `src/lib/database/types.ts` 与实际 schema 一致

### 优化

#### 前端优化
- **Tailwind 统一**: `DocumentSelectModal` 移除内联样式，使用 Tailwind 类
- **MessageList memo**: 添加 React.memo 减少不必要重渲染
- **共享类型**: 创建 `src/types/message.ts` 统一消息类型定义

#### 代码质量
- **常量时间比较**: 密码验证使用 `crypto.timingSafeEqual` 防止时序攻击
- **工具注册优化**: 模块级标志确保只注册一次
- **模型配置化**: 支持 `OPENAI_MODEL` 环境变量切换模型
- **文档错误传播**: 文档加载失败时错误信息传递到状态供下游处理

### 技术细节

- 6 个批次共 21 项需求 (REQ-001 ~ REQ-021)
- REQ-017 (减少 as any) 移至 V3.11
- 安全审计通过，无高危漏洞

---

## [3.10.0] - 2025-12-30

### 新增

#### 用户管理系统
- **Guest 会话**: 匿名用户自动分配临时会话，支持有限功能体验
- **会话历史**: 对话记录持久化，支持多轮对话上下文
- **Guest 文档所有权**: 临时文档与 Guest 会话绑定，24小时后自动清理
- **Rate Limiting**: Guest 用户每日限制（5次文档上传，20次聊天请求）

### 修复

- 修复空消息导致会话历史 API 返回错误的问题
- 修复数据提取快捷操作功能异常

---

## [3.9.1] - 2026-01-05

### 修复

#### Agent 工作流修复
- **Tool Calls 格式转换**: 修复 OpenAI 响应格式与 LangChain 格式不匹配导致的 API 错误
- **消息历史加载**: 修复从数据库加载历史消息时 `tool_calls` 和 `tool_call_id` 丢失的问题
- **空字符串处理**: 修复 AI 消息内容为空字符串时被错误转换为 `null` 的问题

#### 客户端安全修复
- **Storage 模块隔离**: 移除 barrel export 中的 storage 导出，防止客户端意外加载服务端模块
- 更新 5 个 API 路由使用直接导入路径

---

## [3.2.0] - 2025-12-17

### 新增

#### 安全增强
- **服务端速率限制**: Redis 支持的滑动窗口速率限制
  - AI 端点: 20 请求/分钟
  - 认证端点: 5 请求/分钟
  - 数据端点: 60 请求/分钟
- **暴力破解防护**: 3 次失败后延迟，5 次失败后锁定 15 分钟
- **Redis 会话管理**: 24 小时 TTL，HTTP-only Secure Cookie
- **安全响应头**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, CSP, Referrer-Policy, Permissions-Policy
- **审计日志**: 结构化 JSON 日志，自动轮转 (10MB)
- **输入验证**: Zod schema 验证所有 API 请求，长度限制防止资源耗尽
- **错误脱敏**: 生产环境隐藏详细错误信息

#### 基础设施
- **Redis 容器**: `goodman-redis` 提供分布式状态存储
- **Next.js 中间件**: 集中式安全检查入口

### 变更

- 密码验证: 明文比较 → bcrypt 哈希验证 (cost=12)
- 会话存储: 内存 Map → Redis 持久化
- 错误响应: 详细错误信息 → 环境感知脱敏

### 技术细节

- 新增文件: `src/middleware.ts`, `src/lib/redis.ts`, `src/lib/security/*`, `src/lib/validation/api-schemas.ts`
- 测试覆盖: 17 项安全测试全部通过

---

## [3.0.0] - 2025-12-12

### 新增

#### 基础设施
- **VPS 部署**: 从 Vercel Serverless 迁移到自托管 VPS (Ubuntu 24.04 LTS)
- **Docker 容器化**: 应用运行在 Docker 容器中，支持多项目部署
- **nginx 反向代理**: 处理 SSL 终止、WebSocket 代理、安全头注入
- **Cloudflare 集成**: DDoS 防护、CDN 缓存、Origin Certificate SSL
- **UptimeRobot 监控**: HTTPS 可用性监控与告警

#### 运维能力
- **健康检查 API**: 新增 `/api/health` 端点用于容器健康监测
- **自动重启**: Docker `restart: unless-stopped` 策略
- **开机自启**: 系统重启后自动恢复服务
- **日志管理**: Docker 原生日志，支持 `docker compose logs` 查看

### 变更

- 部署平台: Vercel Serverless → VPS + Docker + nginx
- SSL 证书: Vercel 自动 SSL → Cloudflare Origin Certificate (15年有效期)
- 进程管理: Serverless 函数 → Docker 容器 (PM2 可选)
- 超时限制: 60 秒硬限制 → 无限制 (支持长时间 AI 推理)

### 移除

- Vercel Serverless 部署依赖 (代码仍兼容，仅不再使用)

### 安全

- nginx Cloudflare IP 白名单 (仅允许 Cloudflare 流量)
- 直接 IP 访问阻止 (返回 444)
- SSL/TLS 1.2+ 强制
- 安全响应头 (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- .env 文件权限 600
- Docker 容器以非 root 用户运行

### 技术

- Docker: v29.1.2
- Docker Compose: v5.0.0
- nginx: 1.24.0 (Ubuntu)
- Node.js: 20 LTS (容器内)
- 基础镜像: node:20-bookworm-slim (支持 canvas 原生模块)

### 文档

- 新增 `docs/V3.0_PHASE1_REQUIREMENT_DECLARATION.md` - 需求声明
- 新增 `docs/V3.0_PHASE2_DESIGN.md` - 设计文档 (含配置模板)
- 新增 `docs/V3.0_PHASE3-5_TRACK.md` - 实施记录

---

## [2.0.0] - 2025-12-03

### 新增

#### 核心架构
- **双重存储架构**: 结构化表 (PostgreSQL) + 向量嵌入 (pgvector) 支持混合查询
- **22 个预设财务函数**: 确定性计算，覆盖流动性、偿债能力、盈利能力、营运能力、综合分析
- **多维度置信度评分**: 6 因子质量门控，防止 AI 幻觉

#### 功能特性
- **智能首页**: 对话式路由，使用 gpt-5-mini 降低成本
- **管理员模式**: 三击彩蛋解锁数据库上传功能
- **文档管理**: 上传、预览、编辑文档元数据
- **原始文件存储**: Supabase Storage 集成，支持 PDF/图片/Excel 预览
- **可追溯性系统**: 点击引用可查看源文档和计算步骤

#### 财务分析模块
- 22 个预设财务比率函数库
- 动态指标查询（如"销售现金流增长"）
- 杜邦分析（完整分解展示）
- 计算审计追踪

#### 合规指导模块
- 混合检索: 50% 向量相似度 + 50% 关键词匹配
- 结构化法规提取（条文级粒度）
- 用户文档上传（自动向量化）

#### 数据提取模块
- 多格式支持: PDF, PNG, JPG, JPEG, WEBP, GIF, XLSX
- OpenAI Vision API 集成（图像识别提取）
- Excel 解析（智能工作表选择）

### 变更

- 首页改为对话优先界面（原为卡片导航）
- 财务分析改用确定性预设函数（原为 LLM 计算）
- 合规搜索改用混合检索（原为纯向量搜索）
- 所有 Prompt 移至独立 `.txt` 文件（不再支持环境变量覆盖）

### 安全

- 所有 7 个数据库表启用 Row-Level Security (RLS)
- 敏感操作需要管理员密码验证
- Service Key 仅限服务端使用

### 技术

- 数据库: 7 个核心表, 35+ 索引, 4 个自定义函数
- API: 14 个端点覆盖所有模块
- 测试: 100+ 测试场景

---

## [1.0.0] - 2025-01-07

### 新增

- Project Goodman 初始版本发布
- 基础文档提取模块
- 基于 LLM 的财务分析
- 向量搜索的合规指导
- 卡片式导航首页
- Supabase 文档存储集成
- pgvector 向量嵌入

### 技术

- Next.js 15 + React 19 前端
- Tailwind CSS 4 样式
- OpenAI GPT-4 集成
- Vercel Serverless 部署

---

## 版本命名规范

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/):

```
主版本号.次版本号.修订号
MAJOR.MINOR.PATCH

主版本号: 重大架构变更或不兼容的 API 修改
次版本号: 新增功能（向后兼容）
修订号: Bug 修复（向后兼容）
```

**示例**:
- `1.0.0 → 2.0.0`: 架构重写（双重存储、预设函数）
- `2.0.0 → 2.1.0`: 新增功能（如图表可视化）
- `2.1.0 → 2.1.1`: Bug 修复（如 Excel 解析错误）
