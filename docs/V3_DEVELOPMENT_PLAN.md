# Project Goodman V3 开发计划

本文档记录了 V3 版本的开发思路和计划。这些功能需要根本性的架构变更，将在 V2 完成后实施。

---

## 目录

1. [管理用财报体系](#1-管理用财报体系)
2. [智能文档系统](#2-智能文档系统)
3. [VPS 迁移](#3-vps-迁移)
4. [安全增强](#4-安全增强)
5. [LangGraph 迁移](#5-langgraph-迁移)

---

## V3 版本路线图

### 战略方向：AI 辅助系统 → 财务 AI Agent

V3 代表了从"AI 辅助"系统到"AI Agent"架构的根本性转变：

| 方面         | V2（当前）        | V3（目标）           |
| ------------ | ----------------- | -------------------- |
| **用户交互** | 用户选择功能/文档 | Agent 决定使用什么   |
| **工具执行** | 每次请求单个工具  | 带推理的多工具链     |
| **错误处理** | 向用户返回错误    | Agent 用不同方法重试 |
| **状态管理** | 无状态请求        | 有记忆的有状态 Agent |
| **响应时间** | 10-30 秒          | 复杂任务可达数分钟   |

### 优先级顺序

1. **VPS 迁移**（基础）- **AI Agent 必需**
   - 消除 60 秒超时限制
   - 启用 WebSocket 以流式传输 Agent 状态
   - 允许后台工作进程进行文档预处理
   - 提供持久连接以获得更好的性能

2. **LangGraph 迁移**（Agent 框架）
   - 将隐式工作流转换为显式状态图
   - 支持带条件分支的多步骤推理
   - 支持跨模块的对话记忆
   - 向 UI 提供中间结果流式传输

3. **智能文档系统**（Agent 能力）
   - Agent 自动发现相关文档
   - 多源数据提取（结构化 + 文本）
   - 首次尝试失败时使用替代文档重试

4. **管理用财报体系**（高级功能）
   - 复杂的多步骤计算受益于 Agent 架构
   - 自动期间对比和趋势分析
   - 与文档发现集成以获取折旧数据

### 实现阶段

| 阶段     | 功能               | 前置条件   | 工期     |
| -------- | ------------------ | ---------- | -------- |
| **V3.0** | VPS 迁移           | 无         | 1-2 天   |
| **V3.1** | LangGraph 预备重构 | V3.0       | 1 周     |
| **V3.2** | 智能文档系统       | V3.1       | 1-2 周   |
| **V3.3** | LangGraph 完整迁移 | V3.1, V3.2 | 1 周     |
| **V3.4** | 管理用财报体系     | V3.2       | 1 周     |
| **V3.5** | 安全增强           | V3.0       | 持续进行 |

### 架构演进

```
V2 架构（当前）
─────────────────────────
用户 → API Route → LLM (单次调用) → 响应
        └── 手动工具选择
        └── 60s 超时限制
        └── 请求间无状态

V3 架构（目标）
─────────────────────────
用户 → Agent Controller → StateGraph
                              ├── 意图分析节点
                              ├── 文档发现节点
                              ├── 工具选择节点
                              ├── 执行节点（带重试）
                              ├── 验证节点
                              └── 响应生成节点
        └── WebSocket 流式传输状态
        └── 无超时限制
        └── 对话记忆
        └── 后台处理
```

## 1. 管理用财报体系

### 概述

实现**管理用财报体系**（Management Financial Statement System），将传统财务报表重构以进行更深入的分析。

### 背景讨论 (2024-12-03)

我们分析了当前财务数据是否足以构建管理体系指标。主要发现：

#### 数据可用性分析

| 类别 | 指标 | 数据状态 |
|------|------|----------|
| **资产负债表重构** | 净经营资产, 净负债 | ⚠️ 需要经营/金融分类逻辑 |
| **利润表重构** | 税前经营利润, 税后经营净利润, 税后利息费用 | ✅ 可用（可计算税率） |
| **现金流量表重构** | 营业现金毛流量, 营业现金净流量, 实体现金流量 | ❌ 需要折旧与摊销、期间对比 |
| **管理用比率** | 净经营资产净利率, 税后利息率, 净财务杠杆, 管理用ROE | ⚠️ 依赖上述数据 |

#### 已识别的关键挑战

1. **经营与金融分类**
   - 需要业务逻辑来分类资产/负债
   - 金融资产: 货币资金, 交易性金融资产, 债权投资 等
   - 金融负债: 短期借款, 长期借款, 应付债券 等
   - 经营资产: 应收账款, 存货, 固定资产 等
   - 经营负债: 应付账款, 预收款项, 应付职工薪酬 等

2. **折旧与摊销**
   - 标准财务报表中无法直接获取
   - 需从财务报表附注中查找
   - 需要从年度报告中进行文本提取

3. **期间对比数据**
   - "净经营资产增加"等指标需要两个期间的数据
   - 解决方案：数据库已支持 `metric_value_previous` 列
   - 需确保提取时同时填充两个期间

4. **税率计算**
   - 可计算：`所得税费用 / 利润总额`
   - 需处理利润为负的边界情况

#### 待实现的公式

**资产负债表重构：**
```
净经营资产 = 经营资产 - 经营负债 = 净负债 + 股东权益
净负债 = 金融负债 - 金融资产
```

**利润表重构：**
```
税前经营利润 = 营业收入 - 营业成本 - 税金及附加 - 销售/管理费用 (不含利息)
税后经营净利润 = 税前经营利润 × (1 - 所得税税率)
税后利息费用 = 利息费用 × (1 - 所得税税率)
```

**现金流量表重构：**
```
营业现金毛流量 = 税后经营净利润 + 折旧与摊销
营业现金净流量 = 营业现金毛流量 - 经营营运资本增加
实体现金流量 = 营业现金净流量 - 资本支出
融资现金流量 = 债务现金流量 + 股权现金流量
```

**管理用比率：**
```
净经营资产净利率 = 税后经营净利润 / 净经营资产
税后利息率 = 税后利息费用 / 净负债
净财务杠杆 = 净负债 / 股东权益
管理用ROE = 净经营资产净利率 + (净经营资产净利率 - 税后利息率) × 净财务杠杆
```

### 实现依赖

此功能依赖于[智能文档系统](#2-智能文档系统)，因为：
- 折旧与摊销数据在文本型年度报告中
- AI 需要自动查找和提取此数据
- 多期间对比需要智能文档选择

### 建议的实现阶段

1. **阶段 1**：实现资产/负债分类逻辑
2. **阶段 2**：添加利润表重构（当前数据可行）
3. **阶段 3**：集成智能文档系统以实现现金流量表重构
4. **阶段 4**：完成管理用比率和管理用ROE

---

## 2. 智能文档系统

### 概述

用 AI 驱动的自动文档发现和选择替代手动文档选择。

### 背景讨论 (2024-12-03)

两个关键洞察推动了此设计：

1. **多期间数据**：中国财务报表通常包含本期和上期两列（本期金额, 上期金额）。AI 应该理解并从同一文档中提取两个期间的数据，而非分别存储。

2. **文本型财务数据**："2024年度财务报告"等文档在财务报表附注中以文本形式包含关键数据（折旧与摊销）。AI 需要自动从这些文档中查找和提取。

### 当前架构 (V2)

```
用户 → 手动选择文档 → AI 从选定文档中提取 → 计算
```

**局限性：**
- 用户必须知道哪个文档包含什么数据
- 无法结合结构化表格和文本附注
- 复杂计算时手动选择很繁琐

### 建议架构 (V3) - 方案 C：智能默认

**决定**：实现方案 C（智能默认 + 手动覆盖）

```
┌─────────────────────────────────────────────────────────────┐
│  用户问题: "计算2024年的营业现金毛流量"                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤 1: AI 理解数据需求                                     │
│  - 税后经营净利润 (来自利润表)                               │
│  - 折旧与摊销 (来自财务报表附注/年度报告)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤 2: AI 搜索文档 (向量 + 关键词)                         │
│  查询: "2024 折旧 摊销 固定资产"                             │
│  结果:                                                       │
│    - 2024年度财务报告.pdf (得分: 0.92)                       │
│    - 2024利润表.xlsx (得分: 0.85)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤 3: AI 从多个来源提取数据                               │
│  从利润表: 税后经营净利润 = 600,000                          │
│  从年度报告附注: 折旧与摊销 = 150,000                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  步骤 4: 计算并显示来源                                      │
│  营业现金毛流量 = 600,000 + 150,000 = 750,000                │
│  来源: [利润表.xlsx, 年度报告.pdf]                           │
│  [用户可根据需要覆盖文档选择]                                │
└─────────────────────────────────────────────────────────────┘
```

### 现有基础设施（V2 已构建）

| 组件 | 状态 | 备注 |
|------|------|------|
| 向量嵌入 | ✅ 已存在 | `document_chunks.embedding` 列 |
| 多期间存储 | ✅ 已存在 | `financial_data.metric_value_previous` 列 |
| 语义搜索 | ✅ 已存在 | 可按相似度查询 `document_chunks` |
| 关键词 | ✅ 已存在 | `document_chunks.keywords` 列 |

### 需要的新组件

1. **新文档类型**
   ```typescript
   'annual_report'     // 年度财务报告 (综合性)
   'financial_notes'   // 财务报表附注 (详细附注)
   ```

2. **文档搜索 API**
   - 输入：数据需求（指标名称、年份、关键词）
   - 输出：相关文档的排序列表
   - 使用向量相似度 + 关键词匹配

3. **多文档提取**
   - 从结构化表格（Excel）提取
   - 从文本附注（PDF/Word）提取
   - 合并多个来源的数据

4. **来源透明化 UI**
   - 显示 AI 选择了哪些文档
   - 允许用户覆盖/添加文档
   - 显示置信度分数

### 实现任务

1. 在 `document-constants.ts` 中添加新文档类型
2. 创建文档搜索 API 端点
3. 增强提取功能以处理文本型附注
4. 更新财务分析 API 以自动搜索文档
5. 添加来源显示和覆盖 UI
6. 确保多期间提取正常工作

---

## 3. VPS 迁移

### 概述

从 Vercel（免费层）迁移到 VPS，以更好地控制计算资源，特别是对于需要长时间运行进程和实时通信的 AI Agent 架构。

### 动机

- **AI Agent 架构**：多步骤推理需要比 serverless 允许的更长执行时间
- **无超时限制**：Agent 可以根据需要推理数分钟
- **WebSocket 支持**：实时向 UI 推送 Agent "思考"步骤
- **后台工作进程**：预处理文档、预热缓存、运行定时任务
- **持久连接**：保持数据库/OpenAI 连接活跃以提高性能

### 当前 Vercel 限制 (Hobby 层) - 2025-12 更新

| 限制 | Hobby 层 | Pro 层 | 对 AI Agent 的影响 |
|------|----------|--------|-------------------|
| **函数超时** | 默认 10s，**最大 60s** | 默认 15s，最大 300s（Fluid 800s） | ⚠️ **关键阻碍**：复杂 Agent 链 |
| **内存** | 2 GB / 1 vCPU | 4 GB / 2 vCPU | ✅ 足够 |
| **请求/响应体** | 4.5 MB | 4.5 MB | ✅ 足够 |
| **并发执行** | 最多 30,000 | 最多 30,000 | ✅ 足够 |
| **活跃 CPU** | 4 CPU 小时/月 | 1000 CPU 小时 | ⚠️ 高使用量时可能受限 |
| **调用次数** | 100 万/月 | 1000 万/月 | ✅ MVP 足够 |
| **WebSockets** | ❌ 不支持 | ❌ 不支持 | ❌ **阻碍**：实时 Agent 状态 |
| **后台任务** | ❌ 不支持 | ❌ 不支持 | ❌ **阻碍**：文档预处理 |

### AI Agent 执行时间分析

典型的 AI Agent 交互涉及多个步骤：

| 步骤 | 预估时间 | 备注 |
|------|----------|------|
| 意图分析 (LLM) | 2-5s | 理解用户问题 |
| 工具选择 (LLM) | 1-3s | 决定调用哪些函数 |
| 数据库查询 (2-3 次) | 1-2s | 获取结构化数据 |
| 文档检索 | 1-2s | 向量搜索 |
| 最终合成 (LLM) | 3-8s | 生成带引用的响应 |
| **简单查询总计** | **8-20s** | 在 60s 限制内 |
| **复杂多轮 Agent** | **20-45s+** | 可能超过 60s |
| **带重试/优化的 Agent** | **45-90s+** | ❌ 会超时 |

### 可用 VPS 资源 (RackNerd)

我们有一台现成的 VPS 可用于迁移：

| 资源 | 规格 | 对比 Vercel Hobby |
|------|------|------------------|
| **内存** | 4 GB | 2 倍优于 Vercel（最大 2GB） |
| **CPU** | KVM（独享） | 比 serverless 冷启动更稳定 |
| **磁盘** | 65 GB SSD（57 GB 可用） | 远超 Vercel |
| **带宽** | 6.35 TB/月 | 是 Vercel 100 GB 的 63 倍 |
| **操作系统** | Ubuntu 24.04 LTS | 完全控制 |
| **IP** | 104.168.38.213 | 静态 IP |
| **虚拟化** | KVM | 比容器更好的隔离性 |

### VPS vs Vercel：能力对比

| 能力 | Vercel (Serverless) | VPS (持久服务器) |
|------|---------------------|-----------------|
| 请求处理 | 可能冷启动 | 始终运行 (PM2) |
| 执行超时 | 最大 60s (Hobby) | **无限制** |
| 后台任务 | ❌ 不支持 | ✅ Cron、工作进程、队列 |
| WebSocket | ❌ 不支持 | ✅ 完全支持 |
| 请求间状态 | 无状态 | ✅ 内存缓存 |
| 长时间运行进程 | ❌ 不支持 | ✅ Agent 循环、批处理 |
| 自定义运行时 | 有限 (Node/Python) | ✅ 任何语言 |

### 迁移难度分析

#### 总体评估：**低到中等**（基本设置 1-2 小时）

| 方面 | 难度 | 备注 |
|------|:----:|------|
| **Next.js 部署** | 简单 | `npm run build && npm start` 或 PM2 |
| **环境设置** | 简单 | Node.js、npm、nginx 反向代理 |
| **SSL/HTTPS** | 简单 | Let's Encrypt (certbot) |
| **数据库** | 无需迁移 | Supabase 保持云托管 |
| **域名/DNS** | 简单 | 将 A 记录指向 VPS IP |
| **CI/CD** | 中等 | GitHub Actions 或手动部署 |

#### 保持不变的部分
- Supabase (PostgreSQL + pgvector) - 已是外部服务
- Supabase Storage - 已是外部服务
- OpenAI API - 已是外部服务
- 所有应用代码 - 无需修改

#### 需要变更的部分
- 托管平台 (Vercel → VPS)
- 进程管理 (serverless → PM2)
- 反向代理 (Vercel Edge → nginx)
- SSL (Vercel 自动 → Let's Encrypt)

### 成本对比

| 选项 | 月成本 | 超时 | WebSocket | 后台任务 |
|------|:------:|:----:|:---------:|:--------:|
| **Vercel Hobby** | $0 | 60s | ❌ | ❌ |
| **Vercel Pro** | $20 | 300s (Fluid 800s) | ❌ | ❌ |
| **我们的 VPS (RackNerd)** | ~$25/年 | ✅ 无限制 | ✅ | ✅ |

**结论**：VPS 更具成本效益，且消除了所有 serverless 限制。

### VPS 上的推荐架构

```
┌─────────────────────────────────────────────────────────┐
│              VPS (104.168.38.213)                       │
├─────────────────────────────────────────────────────────┤
│  nginx (反向代理 + SSL + WebSocket 支持)                 │
│    ↓                                                    │
│  PM2 (进程管理器，自动重启，日志)                         │
│    ├── Next.js App (端口 3000)                          │
│    │     └── API Routes (财务分析, 合规指导)             │
│    └── Agent Worker (可选, 端口 3001)                   │
│          └── 长时间运行的 Agent 任务、后台作业            │
├─────────────────────────────────────────────────────────┤
│  仍保持云托管（无需迁移）：                               │
│    • Supabase (数据库 + 存储)                           │
│    • OpenAI API                                         │
└─────────────────────────────────────────────────────────┘
```

### 迁移步骤

#### 步骤 1：在 VPS 上安装依赖

```bash
# 连接到 VPS
ssh root@104.168.38.213

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version  # 应显示 v20.x
npm --version

# 全局安装 PM2
sudo npm install -g pm2

# 安装 nginx
sudo apt install -y nginx
```

#### 步骤 2：克隆并构建应用

```bash
# 创建应用目录
sudo mkdir -p /var/www/goodman
sudo chown $USER:$USER /var/www/goodman

# 克隆仓库
git clone https://github.com/your-username/project-goodman.git /var/www/goodman
cd /var/www/goodman

# 安装依赖
npm install

# 创建 .env.local 并填入生产环境值
nano .env.local
# 添加: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, ADMIN_PASSWORD

# 构建生产版本
npm run build
```

#### 步骤 3：使用 PM2 启动

```bash
# 启动应用
cd /var/www/goodman
pm2 start npm --name "goodman" -- start

# 保存 PM2 进程列表（重启后保留）
pm2 save

# 设置 PM2 开机自启
pm2 startup
# 运行它输出的命令

# 查看日志
pm2 logs goodman
```

#### 步骤 4：配置 nginx（支持 WebSocket）

```bash
sudo nano /etc/nginx/sites-available/goodman
```

```nginx
server {
    listen 80;
    server_name goodman.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket 支持（用于未来的 AI Agent 流式传输）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # 标准代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;

        # 增加超时时间以支持长时间的 AI 操作
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/goodman /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl reload nginx
```

#### 步骤 5：使用 Let's Encrypt 配置 SSL

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书（替换为您的域名）
sudo certbot --nginx -d goodman.yourdomain.com

# 自动续期已自动设置
# 测试: sudo certbot renew --dry-run
```

#### 步骤 6：设置部署（可选）

**方案 A：手动部署**
```bash
cd /var/www/goodman
git pull origin main
npm install
npm run build
pm2 restart goodman
```

**方案 B：GitHub Actions（自动化）**
```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: 104.168.38.213
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/goodman
            git pull origin main
            npm install
            npm run build
            pm2 restart goodman
```

### AI Agent 架构的收益

迁移后，以下能力将可用：

| 功能 | 实现方式 | 对 AI Agent 的收益 |
|------|----------|-------------------|
| **无限超时** | nginx `proxy_read_timeout` | Agent 可以推理数分钟 |
| **WebSocket** | nginx upgrade headers | 向 UI 流式传输"思考"步骤 |
| **后台工作进程** | PM2 + 独立进程 | 预处理文档、预热缓存 |
| **内存缓存** | Node.js Map/Redis | 缓存频繁查询、减少 LLM 调用 |
| **定时任务** | PM2 cron 或 node-cron | 每日文档重索引、清理 |

### 结论

**难度：低到中等** - 基本设置 1-2 小时，无需代码修改。

**建议**：
- **在开始 AI Agent 开发时迁移到 VPS**
- 60 秒超时限制和缺乏 WebSocket 支持是构建真正 Agent 架构的阻碍
- 我们的 4GB VPS 非常适合此工作负载
- 保持 Supabase 作为数据库（无需迁移）

---

## 4. 安全增强

### 概述

V2 阶段 6 审计期间识别的安全改进。这些建议用于超出 MVP 演示的生产部署。

### 背景 (2025-12-03)

在 V2 部署准备期间，进行了全面的安全审计。以下改进被识别但推迟到 V3 以允许 MVP 部署。

### 当前状态 (V2 MVP)

**已实现**：
- ✅ 所有 7 个表启用 RLS
- ✅ 管理员密码验证
- ✅ Service key 仅服务端使用
- ✅ Supabase 参数化查询（SQL 注入防护）
- ✅ 客户端速率限制（localStorage）

**已知限制**：
- ⚠️ 无服务端速率限制
- ⚠️ 明文密码比较（无 bcrypt）
- ⚠️ API 响应中暴露详细错误信息
- ⚠️ 无输入长度验证
- ⚠️ 缺少安全头

### 安全增强路线图

#### 第一优先级：关键（生产必需）

| 增强 | 描述 | 实现方式 |
|------|------|----------|
| **服务端速率限制** | 防止 API 滥用和 DoS | 使用 Redis + `rate-limiter-flexible` |
| **输入长度验证** | 防止过大请求 | 为所有字符串输入添加最大长度检查 |
| **错误信息脱敏** | 防止信息泄露 | 移除错误响应中的 `details` 字段 |

**实现细节 - 速率限制**：
```typescript
// 示例：基于 Redis 的速率限制
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10,        // 10 次请求
  duration: 60,      // 每 60 秒
  blockDuration: 60, // 超限后阻止 60 秒
});

// 应用于所有 API 路由
export async function rateLimit(ip: string) {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false; // 被限流
  }
}
```

#### 第二优先级：高

| 增强 | 描述 | 实现方式 |
|------|------|----------|
| **密码哈希** | 存储哈希密码 | 为 ADMIN_PASSWORD 使用 bcrypt |
| **会话令牌** | 替代每次请求的密码认证 | JWT 或安全会话 cookie |
| **暴力破解防护** | 失败次数后锁定 | 指数退避 + 账户锁定 |
| **文件路径验证** | 防止路径遍历 | 验证预览 API 中的 `fileUrl` 参数 |

**实现细节 - 密码哈希**：
```typescript
// 在 env/db 中存储哈希密码
// 在启动或设置时：
const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

// 验证：
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  return bcrypt.compare(password, storedHash);
}
```

#### 第三优先级：中

| 增强 | 描述 | 实现方式 |
|------|------|----------|
| **安全头** | CORS, CSP, X-Frame-Options | Next.js 中间件或 `next.config.js` |
| **文件内容验证** | 魔数检查 | 处理前验证文件签名 |
| **审计日志** | 跟踪管理员操作 | 记录到数据库（时间戳、操作、结果） |
| **函数搜索路径** | 修复 Supabase 警告 | 为函数添加 `SET search_path = public` |

**实现细节 - 安全头**：
```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

### 数据库安全修复

**函数搜索路径**（6 个函数需修复）：
```sql
-- search_financial_data 修复示例
CREATE OR REPLACE FUNCTION public.search_financial_data(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- 添加此行
AS $$
BEGIN
  ...
END;
$$;
```

**需要更新的函数**：
1. `search_financial_data`
2. `search_regulations_hybrid`
3. `get_financial_metrics_by_year`
4. `match_documents`
5. `get_document_with_chunks`
6. `get_documents_by_category`

### 依赖项

| 增强 | 需要 |
|------|------|
| 服务端速率限制 | Redis（或 serverless 用 Upstash Redis） |
| 会话令牌 | Redis 用于会话存储 |
| 审计日志 | 新数据库表 |

### 与 VPS 迁移的集成

迁移到 VPS（第 3 节）后，安全增强变得更容易：
- Redis 可在 VPS 上本地运行（用于速率限制 + 会话存储）
- 无 serverless 对会话管理的约束
- 更好的日志和监控选项（PM2 日志、自定义日志文件）
- 可在 nginx 层实现基于 IP 的封禁
- 后台任务用于审计日志轮转和清理

### V3 实现优先级

1. **V3.0（含 VPS）**：速率限制 + 错误脱敏
2. **V3.1**：密码哈希 + 会话令牌
3. **V3.2**：安全头 + 审计日志
4. **V3.3**：数据库函数修复 + 文件验证

---

## 5. LangGraph 迁移

### 概述

将 AI 编排层从手动工具调用模式迁移到 LangGraph 的 StateGraph 框架。这将实现更好的状态管理、对话记忆、代理循环、流式传输和可测试性改进。

### 背景 (2025-12-05)

对当前代码库的分析表明，现有架构已经展示了可自然映射到 LangGraph 的类 Agent 模式：

| 当前模式 | LangGraph 对应 |
|----------|---------------|
| 手动工具执行循环 | `ToolNode`（自动） |
| 分步状态（路由 → 查询 → 计算 → 评分 → 解释） | `StateGraph` 节点 + 边 |
| 条件逻辑（数据充分？置信度通过？） | 条件边 |
| 每次请求状态 | 带注解的 Graph `State` |

### 迁移收益

1. **对话记忆** — 目前只有 landing-chat 有历史记录；LangGraph 使所有模块都能轻松实现
2. **代理循环** — 启用重试/优化模式（如"首次失败则尝试另一个指标"）
3. **流式响应** — 在图执行时向 UI 发送中间结果
4. **更好的错误恢复** — 定义显式错误边，而非到处 try-catch
5. **可观测性** — LangGraph 的调试/追踪工具可视化图执行
6. **更清洁的代码** — 用声明式图替换 500+ 行的路由文件

### 当前架构分析

#### 已识别的紧耦合区域

**财务分析** (`/api/financial-analysis/route.ts` - 623 行)：
- 第 265-277 行：LLM 函数选择嵌入路由处理器
- 第 299-447 行：动态指标检索逻辑与主流程交织
- 第 464-580 行：数据验证、计算和格式化混在一起
- 第 582-602 行：LLM 解释生成与计算上下文分离

**合规指导** (`/api/guidance-chat/route.ts` - 509 行)：
- 第 98-245 行：混合搜索（关键词 + 向量）紧密集成
- 第 255-378 行：财务指标的工具调用嵌入 LLM 提示流程
- 第 383-425 行：相关文章检索与引用分离

**首页对话** (`/api/landing-chat/route.ts` - 224 行)：
- 第 54-123 行：关键词硬编码，路由逻辑不透明
- 第 128-157 行：每个模块的问题建议硬编码
- 第 175-190 行：LLM 回复调用

#### 已识别的隐式工作流

**财务分析（5 步）**：
```
路由问题 → 查询数据 → 验证输入 → 执行计算 → 评估置信度 → 生成解释
```

**合规指导（5 步）**：
```
混合搜索 → 生成指导 → 执行工具（可选）→ 查找相关 → 评估置信度
```

**首页对话（4 步）**：
```
生成回复 → 分析意图 → 路由到模块 → 生成建议
```

---

### 预备重构（添加 LangGraph 之前）

这些重构可以在 V2 生产期间增量进行，使最终的 LangGraph 迁移变得简单。

#### 阶段 A：提取显式状态类型（优先级：关键）

**原因**：LangGraph 使用带注解的显式状态对象。当前状态分散在各个变量中。

**创建**：`src/lib/types/workflow-states.ts`

```typescript
// 财务分析状态
export interface FinancialAnalysisState {
  // 输入
  question: string;
  year?: string;
  period?: string;
  documentIds?: string[];

  // 步骤 1：功能选择
  selectedFunction?: PresetFunction;
  functionConfidence?: number;

  // 步骤 2：数据查询
  queriedMetrics?: string[];
  financialData?: any[];

  // 步骤 3：验证
  missingMetrics?: string[];
  dataQuality?: number;

  // 步骤 4：计算
  calculation?: CalculationResult;
  rawResult?: ExecutionResult;

  // 步骤 5：置信度
  confidenceScore?: ConfidenceScore;

  // 步骤 6：解释
  explanation?: string;
  sourceDocuments?: SourceDocument[];

  // 错误处理
  error?: string;
  errorType?: 'no_function' | 'insufficient_data' | 'low_confidence' | 'calculation_error';
}

// 合规指导状态
export interface GuidanceState {
  question: string;
  uploadedDocument?: DocumentUpload;
  documentIds: string[];

  // 步骤 1：搜索
  citations?: Citation[];
  semanticSimilarity?: number;

  // 步骤 2：LLM 生成
  guidance?: string;
  toolCallsExecuted?: ToolCallResult[];

  // 步骤 3：相关文章
  relatedArticles?: RelatedArticle[];

  // 步骤 4：置信度
  confidenceScore?: ConfidenceScore;

  // 元数据
  warnings?: string[];
  searchDocIds?: string[];
  error?: string;
}

// 首页对话状态
export interface LandingChatState {
  message: string;
  conversationHistory: ChatMessage[];

  // 步骤 1：回复生成
  reply?: string;
  llmConfidence?: number;

  // 步骤 2：意图分析
  userIntent?: string;
  intentClarity?: number;

  // 步骤 3：模块路由
  suggestedModule?: ModuleInfo;
  routingConfidence?: number;

  // 步骤 4：建议
  suggestedQuestions?: string[];

  // 步骤 5：置信度
  overallConfidence?: ConfidenceScore;
  error?: string;
}
```

---

#### 阶段 B：将工作流步骤提取为纯函数（优先级：高）

**原因**：LangGraph 节点是接收状态并返回状态的函数。现在就提取逻辑。

**创建目录结构**：
```
src/workflows/
├── financial-analysis/
│   ├── steps/
│   │   ├── select-function.ts      // LLM 选择功能
│   │   ├── query-data.ts           // 从 Supabase 获取
│   │   ├── validate-inputs.ts      // 检查完整性
│   │   ├── execute-calculation.ts  // 运行预设函数
│   │   ├── score-confidence.ts     // 多指标评分
│   │   └── generate-explanation.ts // LLM 解释
│   └── index.ts                    // 编排（薄包装）
├── guidance-chat/
│   ├── steps/
│   │   ├── hybrid-search.ts        // 关键词 + 向量搜索
│   │   ├── generate-guidance.ts    // 带上下文的 LLM
│   │   ├── execute-tools.ts        // 工具执行
│   │   └── find-related.ts         // 相关文章
│   └── index.ts
└── landing-chat/
    ├── steps/
    │   ├── generate-reply.ts       // LLM 对话
    │   ├── analyze-intent.ts       // 意图提取
    │   └── route-module.ts         // 模块选择
    └── index.ts
```

**示例步骤函数**（LangGraph 就绪模式）：

```typescript
// src/workflows/financial-analysis/steps/select-function.ts
import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { presetFunctions, findPresetFunction } from '@/lib/preset-functions';

export async function selectFunction(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: state.question }
    ],
    tools: functionDefinitions,
    tool_choice: 'auto',
    temperature: 0.1,
  });

  const toolCall = completion.choices[0].message.tool_calls?.[0];

  if (!toolCall) {
    return {
      ...state,
      errorType: 'no_function',
      error: '无法识别适合的计算功能',
    };
  }

  return {
    ...state,
    selectedFunction: findPresetFunction(toolCall.function.name),
    functionConfidence: 0.9,
  };
}
```

---

#### 阶段 C：集中工具定义（优先级：中）

**原因**：LangGraph 的 `ToolNode` 使用工具注册表。现在就集中。

**创建**：`src/lib/tools/index.ts`

```typescript
import { executeFunction } from '@/lib/preset-functions';

// OpenAI function calling 的工具定义
export const TOOLS = {
  financialAnalysis: [
    {
      type: 'function' as const,
      function: {
        name: 'calculate_preset_function',
        description: '执行预设的财务计算功能，如流动比率、ROE等',
        parameters: {
          type: 'object',
          properties: {
            function_name: { type: 'string', description: '功能名称' },
            year: { type: 'string', description: '财务年份' },
            period: { type: 'string', description: '会计期间' },
          },
          required: ['function_name'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_financial_metric',
        description: '从数据库获取特定财务指标',
        parameters: {
          type: 'object',
          properties: {
            metric_name: { type: 'string', description: '指标名称' },
            year: { type: 'string' },
            period: { type: 'string' },
          },
          required: ['metric_name'],
        },
      },
    },
  ],

  guidanceChat: [
    {
      type: 'function' as const,
      function: {
        name: 'calculate_financial_metric',
        description: '计算财务指标（在合规指导中需要计算时使用）',
        parameters: {
          type: 'object',
          properties: {
            metric_name: { type: 'string' },
            inputs: { type: 'object' },
          },
          required: ['metric_name', 'inputs'],
        },
      },
    },
  ],
};

// 工具执行器注册表（将工具名称映射到实现）
export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<any>> = {
  calculate_preset_function: async (args) => executeFunction(args.function_name, args.inputs),
  get_financial_metric: async (args) => queryFinancialMetric(args.metric_name, args.year, args.period),
  calculate_financial_metric: async (args) => executeFunction(args.metric_name, args.inputs),
};
```

**同时提取路由关键词**：`src/lib/routing/keywords.ts`

```typescript
export const ROUTING_KEYWORDS = {
  'data-extract': ['提取', '读取', 'pdf', 'excel', '解析', '上传', '文档分析'],
  'financial-analysis': ['计算', '分析', '指标', '比率', 'roe', 'roa', '净利润率', '周转率'],
  'guidance-chat': ['税', '合规', '法规', '政策', '增值税', '企业所得税', '会计准则']
};

export const MODULE_SUGGESTIONS: Record<string, string[]> = {
  'data-extract': ['我该如何上传文档？', '支持哪些文档格式？'],
  'financial-analysis': ['可以计算哪些财务指标？', '需要上传什么类型的文档？'],
  'guidance-chat': ['你可以回答哪些税务问题？', '有哪些会计准则可以查询？']
};
```

---

#### 阶段 D：整合类型（优先级：中）

**将分散的类型移到中心位置**：

```
src/lib/types/
├── index.ts                    // 重新导出所有内容
├── workflow-states.ts          // 状态对象（来自阶段 A）
├── financial-analysis.ts       // 请求/响应类型
├── guidance-chat.ts            // 请求/响应类型
├── landing-chat.ts             // 聊天消息类型
└── common.ts                   // 共享类型（ConfidenceScore 等）
```

---

#### 阶段 E：创建错误类型层次（优先级：低）

**创建**：`src/lib/errors/workflow-errors.ts`

```typescript
export enum WorkflowErrorType {
  INPUT_VALIDATION = 'input_validation',
  NO_FUNCTION = 'no_function',
  INSUFFICIENT_DATA = 'insufficient_data',
  LOW_CONFIDENCE = 'low_confidence',
  LLM_ERROR = 'llm_error',
  DATABASE_ERROR = 'database_error',
}

export class WorkflowError extends Error {
  constructor(
    public type: WorkflowErrorType,
    public userMessage: string,  // 中文用户提示
    message: string,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// 在工作流步骤中使用
export function handleWorkflowError(error: unknown): WorkflowError {
  if (error instanceof WorkflowError) return error;

  return new WorkflowError(
    WorkflowErrorType.LLM_ERROR,
    '处理请求时出错，请稍后重试',
    error instanceof Error ? error.message : 'Unknown error'
  );
}
```

---

### 重构后：精简的路由处理器

预备重构后，路由处理器变成简单的编排器：

```typescript
// src/app/api/financial-analysis/route.ts（重构后）
// ~50 行而非 623 行

import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { selectFunction } from '@/workflows/financial-analysis/steps/select-function';
import { queryData } from '@/workflows/financial-analysis/steps/query-data';
import { validateInputs } from '@/workflows/financial-analysis/steps/validate-inputs';
import { executeCalculation } from '@/workflows/financial-analysis/steps/execute-calculation';
import { scoreConfidence } from '@/workflows/financial-analysis/steps/score-confidence';
import { generateExplanation } from '@/workflows/financial-analysis/steps/generate-explanation';

export async function POST(request: Request) {
  const body = await request.json();

  // 初始化状态
  let state: FinancialAnalysisState = {
    question: body.question,
    documentIds: body.documentIds,
    year: body.year,
    period: body.period,
  };

  // 运行工作流（之后可轻松替换为 LangGraph）
  state = await selectFunction(state);
  if (state.error) return errorResponse(state);

  state = await queryData(state);
  state = await validateInputs(state);
  if (state.error) return errorResponse(state);

  state = await executeCalculation(state);
  state = await scoreConfidence(state);
  state = await generateExplanation(state);

  return NextResponse.json(buildResponse(state));
}
```

---

### LangGraph 实现（未来）

预备重构完成后，添加 LangGraph 变得简单：

```typescript
// src/workflows/financial-analysis/graph.ts
import { StateGraph, END } from '@langchain/langgraph';
import { FinancialAnalysisState } from '@/lib/types/workflow-states';
import { selectFunction } from './steps/select-function';
import { queryData } from './steps/query-data';
import { validateInputs } from './steps/validate-inputs';
import { executeCalculation } from './steps/execute-calculation';
import { scoreConfidence } from './steps/score-confidence';
import { generateExplanation } from './steps/generate-explanation';

// 定义图
const financialAnalysisGraph = new StateGraph<FinancialAnalysisState>({
  channels: {
    question: { value: (a, b) => b ?? a },
    selectedFunction: { value: (a, b) => b ?? a },
    financialData: { value: (a, b) => b ?? a },
    // ... 其他状态通道
  }
})
  .addNode("select_function", selectFunction)
  .addNode("query_data", queryData)
  .addNode("validate_inputs", validateInputs)
  .addNode("execute_calculation", executeCalculation)
  .addNode("score_confidence", scoreConfidence)
  .addNode("generate_explanation", generateExplanation)
  .addNode("handle_error", handleError)

  // 定义边
  .addEdge("__start__", "select_function")
  .addConditionalEdges(
    "select_function",
    (state) => state.error ? "error" : "continue",
    { error: "handle_error", continue: "query_data" }
  )
  .addEdge("query_data", "validate_inputs")
  .addConditionalEdges(
    "validate_inputs",
    (state) => state.error ? "error" : "continue",
    { error: "handle_error", continue: "execute_calculation" }
  )
  .addEdge("execute_calculation", "score_confidence")
  .addEdge("score_confidence", "generate_explanation")
  .addEdge("generate_explanation", END)
  .addEdge("handle_error", END);

export const financialAnalysisExecutor = financialAnalysisGraph.compile();

// 在路由处理器中使用
const result = await financialAnalysisExecutor.invoke({
  question: body.question,
  documentIds: body.documentIds,
});
```

---

### 实现优先级

| 阶段 | 任务 | 工作量 | 影响 | LangGraph 收益 |
|------|------|--------|------|---------------|
| **A** | 提取状态类型 | 低 | 高 | 直接映射到 StateGraph 注解 |
| **B** | 提取步骤函数 | 中 | 非常高 | 直接成为图节点 |
| **C** | 集中工具 | 低 | 高 | 接入 ToolNode |
| **D** | 整合类型 | 低 | 中 | 更清洁的导入 |
| **E** | 错误层次 | 低 | 中 | 使用条件边处理错误路径 |

### 建议顺序

1. **阶段 A** 首先（为其他一切创建基础）
2. **阶段 B** 其次（影响最大，启用测试）
3. **阶段 C + D** 可以一起做（快速收益）
4. **阶段 E** 最后（优先级最低）

### 依赖项

- 预备重构无外部依赖
- LangGraph 迁移需要：`@langchain/langgraph`、`@langchain/core`
- 可选：`@langchain/openai`（或继续直接使用 `openai`）

### 与其他 V3 功能的集成

| V3 功能 | LangGraph 收益 |
|---------|---------------|
| **VPS 迁移** | **必需** - LangGraph Agent 需要无限超时用于多步骤推理；流式传输需要 WebSocket 支持 |
| **智能文档系统** | 将文档搜索作为图节点添加；首次搜索失败时启用重试 |
| **管理用财报体系** | 复杂的多步骤计算受益于显式状态图 |

### 为什么 LangGraph 需要 VPS

LangGraph 的强大来自多步骤 Agent 执行，这与 Vercel 的 serverless 约束不兼容：

| LangGraph 功能 | Vercel 限制 | VPS 解决方案 |
|----------------|------------|-------------|
| 多步骤推理 | 60s 超时 | 无超时 |
| 流式中间步骤 | 无 WebSocket | 完全 WebSocket 支持 |
| 重试/优化循环 | 无状态，超时 | 持久进程 |
| 人在回路中 | 无 WebSocket | 实时通信 |
| 后台预处理 | 无后台任务 | PM2 工作进程 |

---

## 备注与想法

（未来想法的空间）

- 如果公开部署，考虑添加用户认证
- 探索重复计算的缓存策略（VPS 上的 Redis）
- 用于实时 Agent 状态流式传输的 WebSocket（VPS 迁移后启用）
- 考虑使用 Redis 进行对话记忆持久化
- 探索 LangSmith 用于 Agent 可观测性和调试
