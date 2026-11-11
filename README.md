# Project Goodman · AI 财务助手

面向企业会计部门的 AI 财务助手：用自然语言查询财务指标、问法规与准则、生成财务分析报告。每一步计算都可以展开查看，每一条法规出处都能打开原文核对。

**在线体验**：[goodman.antelacus.com](https://goodman.antelacus.com)，无需注册，进入即分配访客会话；功能介绍在首页。

## 值得看的地方

| 设计 | 在哪里 |
|------|--------|
| 回答中的条款号只能来自检索结果：模型按证据编号引用，程序生成出处；模型自写的条款号一律删去 | `docs/features/ai-provider/REQ.md` §5.4，`src/lib/citations/` |
| 财务指标用确定性公式计算，不交给模型算 | `src/lib/financial/` |
| Agent 工作流（LangGraph）：检索、工具调用与回答核对 | `src/lib/workflows/` |
| AI 调用只有一个入口，失败时如实显示失败，不编造分析 | `src/lib/ai/` |
| 每个版本的需求、设计、评审发现与裁定都留档 | `docs/features/` |

## 文档

| 想了解 | 看这里 |
|--------|--------|
| 系统架构与部署拓扑 | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| 安全边界与漏洞报告 | [docs/SECURITY.md](docs/SECURITY.md) |
| 各功能的需求与设计 | `docs/features/<功能>/REQ.md`、`DESIGN.md` |
| 版本变更 | [CHANGELOG.md](CHANGELOG.md) |
| 已知限制与技术债 | [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md) |

## 本地运行

需要一个 Supabase 项目、Redis 和一个 OpenAI 兼容的 AI 服务。所需环境变量见 [.env.example](.env.example)，命令见 `package.json` 的 `scripts`。

## 版权

保留所有权利。本仓库公开仅供查看，未授予使用、复制、修改或分发代码的许可。
