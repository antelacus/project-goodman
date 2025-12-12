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

*暂无未发布的变更。*

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
- 新增 `docs/V3.0_PHASE3-5_DEVELOPMENT_TRACK.md` - 实施记录

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
