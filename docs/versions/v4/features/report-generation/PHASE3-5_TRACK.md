# v4.2 报告生成系统 - Phase 3-5 实现追踪

> **版本**: v4.2
> **功能名称**: report-generation (财务分析报告生成)
> **创建日期**: 2026-01-09
> **状态**: 实现中

---

## 实现任务清单

### Task 1: 数据库迁移 ✅
**文件**: `supabase/migrations/20260109000000_add_reports_table.sql`

- [x] 创建 `reports` 表
- [x] 添加索引 (owner, created_at, expires_at, year)
- [x] 配置 RLS 策略 (permissive, app-level auth)
- [x] 添加 updated_at 触发器
- [x] 应用迁移到 Supabase
- [x] 重新生成 TypeScript 类型

**实现细节**:
```
- 表结构: id, owner_id, owner_type, title, report_type, year, comparison_year,
  content (JSONB), summary_text, pdf_storage_path, generation_time_ms,
  created_at, updated_at, expires_at
- 索引: idx_reports_owner, idx_reports_created, idx_reports_expires (partial), idx_reports_year
- RLS: "Allow all access to reports" (USING true) - 授权在 API 层处理
- 触发器: update_reports_timestamp() 自动更新 updated_at
- TypeScript 类型已同步到 src/lib/database/database.types.ts
```

---

### Task 2: 类型定义 ✅
**文件**:
- `src/types/report.ts`
- `src/types/report-events.ts`

- [x] 定义 ReportContent 接口
- [x] 定义 ReportSection 接口
- [x] 定义 ReportMetric 接口
- [x] 定义 ReportSourceReference 接口
- [x] 定义 SSE 事件类型 (Phase, Section, Complete, Error, Process)
- [x] 导出所有类型到 index.ts

**实现细节**:
```
report.ts:
- ReportContent: 完整报告结构 (title, sections, summary)
- ReportSection: 章节结构 (id, title, metrics, analysis)
- ReportMetric: 单个指标 (name, toolName, value, formatted, change, sourceDocumentIds)
- ReportSourceReference: 来源文档引用
- ReportSectionId: 'liquidity' | 'solvency' | 'profitability' | 'efficiency' | 'comprehensive'
- ReportListItem, ReportRecord: 数据库记录类型

report-events.ts:
- ReportPhaseEvent: 阶段进度 (check, gather, analyze, generate)
- ReportSectionEvent: 章节完成
- ReportCompleteEvent: 报告完成
- ReportErrorEvent: 错误事件
- ReportProcessEvent: 工具执行进度 (可选)
- REPORT_PHASES: 默认阶段显示配置
```

---

### Task 3: 报告工作流图 ✅
**文件**: `src/lib/workflows/report/`

#### 3.1 状态定义
- [x] 创建 `state.ts` - ReportWorkflowState 接口

#### 3.2 常量配置
- [x] 创建 `constants.ts` - REPORT_SECTIONS 配置 (5 sections, 21+ metrics)

#### 3.3 节点实现
- [x] 创建 `nodes/check-data-availability.ts` - Phase 1 数据检查
- [x] 创建 `nodes/gather-metrics.ts` - Phase 2 并行工具执行
  - **Implementation Note**: sourceDocumentIds captures both primary AND comparison year documents
- [x] 创建 `nodes/gather-context.ts` - Phase 2b 上下文获取
- [x] 创建 `nodes/analyze-sections.ts` - Phase 3 LLM 分析
- [x] 创建 `nodes/assemble-report.ts` - Phase 4 组装报告
- [x] 创建 `nodes/index.ts` - 节点导出

#### 3.4 边和路由
- [x] 创建 `edges.ts` - shouldProceed 条件函数

#### 3.5 提示词
- [x] 创建 `prompts.ts` - 章节分析提示词模板

#### 3.6 图定义
- [x] 创建 `graph.ts` - LangGraph StateGraph 定义

**实现细节**:
```
文件结构:
- src/lib/workflows/report/
  ├── index.ts          - 模块导出
  ├── state.ts          - ReportWorkflowState, MetricResult 类型
  ├── constants.ts      - REPORT_SECTIONS (5), METRIC_DISPLAY_NAMES (21+)
  ├── prompts.ts        - buildSectionAnalysisPrompt, buildSummaryPrompt
  ├── edges.ts          - shouldProceed 条件路由
  ├── graph.ts          - StateGraph 定义和编译
  └── nodes/
      ├── index.ts
      ├── check-data-availability.ts  - 查询 financial_data 表
      ├── gather-metrics.ts           - Promise.all 并行执行工具
      ├── gather-context.ts           - 收集源文档引用
      ├── analyze-sections.ts         - GPT-4o 生成分析文字
      └── assemble-report.ts          - 组装 ReportContent

流程: START → checkDataAvailability → [proceed?] → gatherMetrics
      → gatherContext → analyzeSections → assembleReport → END
```

---

### Task 4: API 路由 ✅
**文件**: `src/app/api/reports/`

#### 4.1 生成报告 (SSE)
- [x] 创建 `generate/route.ts`
- [x] 实现 SSE 流
- [x] 集成工作流图
- [x] 发送 phase/process/section/complete 事件
- [x] 处理错误

#### 4.2 保存报告
- [x] 创建 `save/route.ts`
- [x] 写入 reports 表
- [x] 生成 PDF (Task 5)
- [x] 上传到 Supabase Storage (Task 5)
- [x] 返回签名 URL (Task 5)

#### 4.3 报告列表
- [x] 创建 `route.ts` (GET)
- [x] 查询用户报告
- [x] 返回列表数据

#### 4.4 单个报告
- [x] 创建 `[id]/route.ts` (GET)
- [x] 验证所有权
- [x] 返回报告详情

#### 4.5 PDF 下载
- [x] 创建 `[id]/pdf/route.ts` (GET)
- [x] 生成签名 URL
- [x] 返回下载链接

**实现细节**:
```
文件结构:
- src/app/api/reports/
  ├── generate/route.ts     - POST: SSE 流式生成报告
  ├── save/route.ts         - POST: 保存报告到数据库 (PDF 生成待 Task 5)
  ├── route.ts              - GET: 获取用户报告列表
  └── [id]/
      ├── route.ts          - GET: 获取单个报告详情
      └── pdf/route.ts      - GET: 获取 PDF 签名下载 URL

generate/route.ts:
- 使用 reportWorkflowGraph.streamEvents() 获取工作流事件
- 映射 LangGraph 事件到报告 SSE 事件 (phase/section/complete/error)
- 支持 phase 事件: check, gather, analyze, generate
- 支持 section 事件: 每个章节分析完成时发送
- 错误处理: 捕获工作流错误并发送 error 事件
- Guest 速率限制: 3 次/小时 (新增 'report' action 到 guest-rate.ts)

save/route.ts:
- CSRF 保护
- 会话验证 (admin/user/guest)
- 保存报告到 reports 表
- Guest 报告 24 小时后过期
- PDF 生成和上传待 Task 5 实现

route.ts (报告列表):
- 按 owner_id + owner_type 过滤
- 按 created_at DESC 排序
- 返回前 50 条

[id]/route.ts (单个报告):
- UUID 格式验证
- 所有权验证 (owner 或 admin)
- 返回完整 ReportRecord

[id]/pdf/route.ts (PDF 下载):
- 所有权验证
- 检查 pdf_storage_path 是否存在
- 使用 getSignedFileUrl() 生成 1 小时有效签名 URL

验证 Schema (api-schemas.ts):
- ReportGenerateSchema: year (必需), comparisonYear (可选)
- ReportSaveSchema: content (ReportContent), year, comparisonYear
- ReportIdParamSchema: id (UUID)

TypeScript 编译: 通过 ✓
```

---

### Task 5: PDF 生成器 ✅
**文件**:
- `src/lib/reports/pdf-generator.tsx`
- `src/lib/reports/pdf-upload.ts`
- `src/lib/reports/index.ts`

- [x] 安装 `@react-pdf/renderer`
- [x] 注册中文字体 (Noto Sans SC)
- [x] 创建 PDF 模板组件
- [x] 实现 generateReportPDF 函数
- [x] 实现 uploadReportPdf 和 generateAndSaveReportPdf 函数
- [x] 集成到 save route
- [x] 测试 PDF 输出

**实现细节**:
```
文件结构:
- src/lib/reports/
  ├── index.ts             - 模块导出
  ├── pdf-generator.tsx    - PDF 渲染组件和生成函数
  └── pdf-upload.ts        - Storage 上传和数据库更新

字体:
- public/fonts/NotoSansSC-Regular.otf (8.3 MB)
- public/fonts/NotoSansSC-Bold.otf (8.5 MB)
- 使用本地字体文件确保可靠性
- Font.registerHyphenationCallback 禁用中文连字符

PDF 模板组件:
- ReportDocument: 主文档组件
- ExecutiveSummary: 执行摘要 (关键发现/风险警示/建议)
- ReportSectionComponent: 章节组件 (可折叠)
- MetricsTable: 指标表格 (名称/当期/上期/变化)

样式:
- 专业蓝色调配色方案 (#1a365d primary)
- A4 纸张尺寸，40px 边距
- 指标表格交替行背景色
- 正值绿色/负值红色变化显示
- 页脚页码和声明

函数:
- generateReportPDF(report: ReportContent): Promise<Buffer>
- uploadReportPdf(reportId, buffer, year, comparisonYear?): Promise<string>
- generateAndSaveReportPdf(reportId, content, year, comparisonYear?): Promise<string>

save route 集成:
- 保存报告后调用 generateAndSaveReportPdf
- 生成 PDF → 上传到 Storage → 更新 pdf_storage_path
- 返回签名 URL 供立即下载
- PDF 生成失败不阻断保存 (graceful degradation)

存储路径: reports/{reportId}/report_{year}_{timestamp}.pdf

性能:
- PDF 生成约 900ms (包含字体加载)
- 大小约 140 KB (5 章节示例)

测试: tests/test-pdf-generator.ts 通过 ✓
TypeScript 编译: 通过 ✓
```

---

### Task 6: React 组件
**文件**: `src/components/reports/`

#### 6.1 报告消息
- [ ] 创建 `ReportMessage.tsx` - 主报告组件
- [ ] 实现可折叠章节状态
- [ ] 集成子组件

#### 6.2 执行摘要
- [ ] 创建 `ReportSummary.tsx`
- [ ] 显示关键发现、风险警示、建议

#### 6.3 报告章节
- [ ] 创建 `ReportSection.tsx`
- [ ] 实现展开/折叠
- [ ] 指标表格
- [ ] 分析文字
- [ ] 来源链接

#### 6.4 生成进度
- [ ] 创建 `ReportProgress.tsx`
- [ ] 阶段进度指示器
- [ ] 章节完成状态

#### 6.5 操作按钮
- [ ] 创建 `ReportActions.tsx`
- [ ] 保存按钮
- [ ] 导出 PDF 按钮

#### 6.6 导出
- [ ] 创建 `index.ts` - Barrel export

**实现细节**:
```
待实现时补充
```

---

### Task 7: 聊天集成
**修改文件**:
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatWorkspace.tsx`
- `src/components/chat/MessageList.tsx`

#### 7.1 ChatInput 修改
- [ ] 添加"工具"下拉菜单
- [ ] 添加"生成报告"选项
- [ ] 添加报告模式指示器
- [ ] 处理模式切换

#### 7.2 ChatWorkspace 修改
- [ ] 添加报告模式状态
- [ ] 集成 useReportGeneration hook
- [ ] 渲染 ReportProgress (生成中)
- [ ] 渲染 ReportMessage (生成完成)

#### 7.3 MessageList 修改
- [ ] 检测报告类型消息
- [ ] 渲染 ReportMessage 组件

**实现细节**:
```
待实现时补充
```

---

### Task 8: 文档页面集成
**文件**:
- `src/components/documents/ReportsList.tsx`
- `src/app/(workspace)/documents/page.tsx`

#### 8.1 ReportsList 组件
- [ ] 创建报告列表组件
- [ ] 获取报告列表
- [ ] 显示报告卡片
- [ ] 下载 PDF 功能

#### 8.2 文档页面修改
- [ ] 添加"分析报告"区域/标签
- [ ] 集成 ReportsList 组件

**实现细节**:
```
待实现时补充
```

---

### Task 9: useReportGeneration Hook
**文件**: `src/hooks/useReportGeneration.ts`

- [ ] 创建 Hook
- [ ] 实现 SSE 流解析
- [ ] 管理阶段进度状态
- [ ] 管理章节状态
- [ ] 管理最终报告状态
- [ ] 实现 startGeneration 方法
- [ ] 实现 saveReport 方法
  - **UX Note**: PDF generation with custom fonts + Supabase upload can take 2-4 seconds.
    The `isSaving` state must trigger an explicit "正在生成PDF并保存..." message in the UI,
    not a generic spinner. Users need to understand the system is doing heavy work.
- [ ] 实现 reset 方法
- [ ] 处理取消/中断

**实现细节**:
```
待实现时补充
```

---

### Task 10: 验证 Schema
**修改文件**: `src/lib/validation/api-schemas.ts`

- [ ] 添加 ReportGenerateSchema
- [ ] 添加 ReportSaveSchema
- [ ] 添加 ReportIdParamSchema

**实现细节**:
```
待实现时补充
```

---

## 测试清单

### 单元测试
- [ ] 工作流节点单元测试
- [ ] 变化值计算测试 (正、负、N/A)
- [ ] PDF 生成测试

### 集成测试
- [ ] `/api/reports/generate` SSE 端到端测试
- [ ] `/api/reports/save` 保存和 PDF 测试
- [ ] 访客速率限制测试

### 手动测试
- [ ] 从工具菜单触发"生成报告"
- [ ] 对话式配置（年份选择）
- [ ] 报告在聊天区域渲染，章节可折叠
- [ ] 保存报告 → 出现在文档页面
- [ ] PDF 下载正常
- [ ] 年度对比显示正确
- [ ] 数据缺失时的优雅处理

---

## 相关文档

- [Phase 1 PRD](./PHASE1_PRD.md)
- [Phase 2 设计文档](./PHASE2_DESIGN.md)
- [v4 开发计划](../../v4_DEVELOPMENT_PLAN.md)

---

*文档创建: 2026-01-09*
*状态: 待实现*
