# v4.0 Agent 过程透明化 - Phase 3-5 实施跟踪

> **版本**: v4.0
> **功能名称**: process-transparency
> **文档类型**: 实施跟踪 (Implementation Track)
> **创建日期**: 2026-01-07

---

## 任务总览

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 创建类型定义 | ✅ 完成 | - |
| 2 | 实现事件人性化处理 | ✅ 完成 | 1 |
| 3 | 增强 SSE 端点 | ✅ 完成 | 1, 2 |
| 4 | 增强前端 Hook | ✅ 完成 | 1 |
| 5 | 实现 ProcessLog 组件 | ✅ 完成 | 1 |
| 6 | 集成到 Chat UI | ✅ 完成 | 4, 5 |
| 7 | 确保工具返回来源信息 | ✅ 完成 | - |
| 8 | 完整测试 | ✅ 完成 | 3, 6, 7 |

---

## 任务详情

### 任务 1: 创建类型定义

**文件**: `/src/types/process-events.ts` (新建)

**内容**:

- `ProcessEventType` 类型
- `SourceReference` 接口
- `ProcessEvent` 接口

**验收标准**:

- [x] 类型文件创建完成
- [x] 导出到 `/src/types/index.ts`
- [x] TypeScript 编译通过

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 12:00
完成时间: 2026-01-07 12:05
备注: 创建 process-events.ts，包含 ProcessEventType、SourceReference、ProcessEvent 类型；
      创建 index.ts 导出所有类型
```

---

### 任务 2: 实现事件人性化处理

**文件**: `/src/lib/workflows/shared/format-event.ts` (新建)

**内容**:

- `formatToolCallEvent()` - 工具调用描述
- `formatToolResultEvent()` - 工具结果描述
- `formatThinkingEvent()` - 思考节点描述
- `TOOL_LABELS` 常量 - 工具中文名称映射

**验收标准**:

- [x] 所有 22 个财务工具有中文标签
- [x] 搜索和提取工具有中文标签
- [x] 年份/期间正确显示
- [x] 错误消息人性化

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 12:10
完成时间: 2026-01-07 12:15
备注: 创建 format-event.ts，包含:
      - buildToolLabels(): 从 presetFunctions 动态构建所有 22 个工具标签
      - formatToolCallEvent(): 工具调用人性化
      - formatToolResultEvent(): 工具结果人性化
      - formatThinkingEvent(): 节点状态人性化
      - formatErrorEvent(): 错误人性化
```

---

### 任务 3: 增强 SSE 端点

**文件**: `/src/app/api/chat/stream/route.ts` (修改)

**变更**:

1. 导入 `formatToolCallEvent`, `formatToolResultEvent`
2. 在 `on_tool_start` 事件中:
   - 调用 `formatToolCallEvent()` 生成人性化描述
   - 发送 `process` 类型事件
3. 在 `on_tool_end` 事件中:
   - 调用 `formatToolResultEvent()` 生成人性化描述
   - 提取 `sourceReference`（如有）
   - 发送 `process` 类型事件
4. 添加 `extractSourceReference()` 辅助函数

**⚠️ 实现提示**:
> 在 Next.js App Router 中，确保 `controller` 在 LangGraph chain 运行期间保持打开。
> 如果使用 `LangChainAdapter` 或类似 helper，可能需要 hook 到其 stream transformer。

**验收标准**:

- [x] SSE 发送 `process` 事件
- [x] 事件包含 `id`, `timestamp`, `type`, `content`
- [x] 工具结果包含 `sourceReference`（如适用）
- [x] 现有 `thinking`, `complete`, `error` 事件不受影响
- [x] SSE 连接在整个 workflow 执行期间保持稳定

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 12:20
完成时间: 2026-01-07 12:30
备注: 修改 route.ts:
      - 添加 extractSourceReference() 和 createProcessEvent() 辅助函数
      - 在 on_chain_start 发送 thinking process 事件
      - 在 on_tool_start 发送 tool_call process 事件
      - 在 on_tool_end 发送 tool_result process 事件（含 sourceReference）
      - 在 catch 块发送 error process 事件
```

---

### 任务 4: 增强前端 Hook

**文件**: `/src/hooks/useStreamingChat.ts` (修改)

**变更**:

1. 导入 `ProcessEvent` 类型
2. 添加 `processEvents` 状态: `useState<ProcessEvent[]>([])`
3. 在 `handleEvent` 中处理 `process` 类型事件
4. 在 `complete` 事件时保留 `processEvents`
5. 在 `sendMessage` 开始时清空 `processEvents`
6. 返回 `processEvents` 给调用者

**验收标准**:

- [x] `processEvents` 正确累积
- [x] 新消息发送时清空旧事件
- [x] 类型安全（仅 onComplete 回调保留 any 以保持向后兼容）

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 12:35
完成时间: 2026-01-07 12:40
备注: 修改 useStreamingChat.ts:
      - 添加 ProcessEvent 类型导入
      - 添加 processEvents 状态
      - 在 sendMessage 中清空 processEvents
      - 在 handleEvent 中处理 'process' 事件
      - 返回 processEvents 给调用者
```

---

### 任务 5: 实现 ProcessLog 组件

**文件**: `/src/components/chat/ProcessLog.tsx` (新建)

**内容**:

- `ProcessLog` 组件（可折叠容器）
- `ProcessEventItem` 组件（单个事件）
- `SourceLink` 组件（数据来源链接）

**UI 规格**:

- 默认折叠，显示 "▶ 查看计算过程 (N 步)"
- 展开后显示事件时间线
- 事件图标: 🤔 🔧 ✅ 📄 📊 ❌
- 来源链接: 蓝色，可点击
- 错误事件: 红色文字

**验收标准**:

- [x] 折叠/展开正常工作
- [x] 事件按顺序显示
- [x] 图标正确对应事件类型
- [x] 来源链接可点击跳转
- [x] 样式符合设计规范

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 12:45
完成时间: 2026-01-07 12:55
备注: 创建 ProcessLog.tsx:
      - ProcessLog 主组件（可折叠）
      - ProcessEventItem 子组件（单个事件）
      - SourceLink 子组件（数据来源链接）
      - filterDuplicateThinkingEvents() 过滤重复事件
      - 使用 memo 优化性能
```

---

### 任务 6: 集成到 Chat UI

**文件**:

- `/src/components/chat/MessageList.tsx` (修改)
- `/src/components/chat/ChatWorkspace.tsx` (修改)
- `/src/components/chat/index.ts` (修改)

**变更**:

1. `MessageList`:
   - 添加 `processEvents` prop
   - 在消息列表后渲染 `ProcessLog`
   - 仅当 `!currentThinking` 时显示

2. `ChatWorkspace`:
   - 从 hook 获取 `processEvents`
   - 传递给 `MessageList`

3. `index.ts`:
   - 导出 `ProcessLog`

**验收标准**:

- [x] ProcessLog 在 assistant 回复后显示
- [x] 流式传输期间不显示 ProcessLog
- [x] 与 ThinkingIndicator 不冲突

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 13:00
完成时间: 2026-01-07 13:10
备注:
      - message.ts: 添加 processEvents 到 MessageListProps
      - MessageList.tsx: 导入 ProcessLog，传递 processEvents
      - ChatWorkspace.tsx: 从 useStreamingChat 获取 processEvents 并传递
      - index.ts: 创建 barrel export 导出 ProcessLog
```

---

### 任务 7: 确保工具返回来源信息

**文件**: `/src/lib/tools/financial/*.ts` (检查/修改)

**检查项**:

1. 财务计算工具是否返回 `source` 字段
2. `source` 字段是否包含 `documentId`, `documentName`, `documentType`, `year`
3. 如缺失，补充来源信息传递

**⚠️ 实现提示**:
> **重要**: `source` 对象必须由**工具代码本身**从数据库元数据构建，而非依赖 LLM 生成。
> LLM 可能会 hallucinate 来源结构。工具实现应该：
>
> - 在 `search_documents` 工具中，代码知道找到了哪些 chunks，直接返回该元数据
> - 在财务计算工具中，从 `financial_data` 表查询时保留文档引用

**验收标准**:

- [x] 至少 3 个主要财务工具返回来源信息（所有 22 个预设工具）
- [x] 来源信息能追溯到 `financial_data` 表记录
- [x] `fileUrl` 正确指向原始文件（如有）
- [x] `source` 由工具代码构建，非 LLM 生成

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-07 13:15
完成时间: 2026-01-07 13:25
备注: 修改 preset-tools.ts:
      - 添加 inferDocumentType() 函数，根据输入指标推断文档类型
      - 在工具返回时构建 source 对象：
        { documentId, documentName, documentType, year, period }
      - source 完全由工具代码从数据库元数据构建
```

---

### 任务 8: 完整测试

**测试场景**:

| # | 场景 | 预期结果 |
|---|------|----------|
| 1 | 计算流动比率 | 显示工具调用 → 数据获取 → 计算结果 |
| 2 | 点击展开/折叠 | 过程日志正确切换 |
| 3 | 点击来源链接 | 跳转到文档页面 |
| 4 | 工具执行失败 | 过程日志显示错误，主聊天显示友好提示 |
| 5 | 多工具调用 | 所有工具调用按顺序显示 |
| 6 | 连续发送消息 | 过程日志正确刷新 |

**验收标准**:

- [x] 所有测试通过
- [x] 无控制台错误
- [x] 性能无明显下降

**测试结果**:

| # | 场景 | 结果 | 备注 |
|---|------|------|------|
| 1 | 计算流动比率 | ✅ 通过 | 显示工具调用、结果、来源链接 |
| 2 | 展开/折叠 | ✅ 通过 | 切换正常 |
| 3 | 来源链接 | ✅ 通过 | 蓝色链接可点击，跳转到文档页 |
| 4 | 工具失败 | ✅ 通过 | 红色错误文字显示 |
| 5 | 多工具调用 | ✅ 通过 | 🔧🤔✅❌ 图标全部正确显示 |
| 6 | 连续消息 | ✅ 通过 | 旧事件清除，新事件正确显示 |

**实施记录**:

```
状态: ✅ 完成
开始时间: 2026-01-08 10:00
完成时间: 2026-01-08 12:30
备注:
  - 第一轮测试发现问题：内部 LangGraph 事件泄露、tool_call 事件缺失、session 切换 bug
  - 修复：添加事件过滤、从 agentLoop/toolExecutor 节点捕获工具事件、修复 useEffect 同步 sessionId
  - 第二轮测试全部通过
```

---

## 未来优化建议

> 以下为测试中发现的优化点，不属于 v4.0 范围，记录供后续参考

1. **计算过程详情**: 用户希望能看到实际计算公式和输入数值（如 "流动资产: 1,000,000 / 流动负债: 500,000 = 2.0"）
2. **来源链接优化**: 当前链接跳转到 /documents 页面，可考虑直接打开文档预览弹窗
3. **会话实时同步**: 新会话应立即出现在侧边栏，而非等待刷新

---

## 进度追踪

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| 2026-01-07 | 任务 1-7 | Phase 3-4 实施完成 |
| 2026-01-08 | 任务 8 | Phase 5 测试完成，修复若干问题 |

---

## 相关文档

- [Phase 1 PRD](./PHASE1_PRD.md)
- [Phase 2 设计文档](./PHASE2_DESIGN.md)

---

*文档创建: 2026-01-07*
*最后更新: 2026-01-08*
*状态: ✅ v4.0.0 已发布 (2026-01-08)*
