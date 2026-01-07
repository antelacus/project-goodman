# v4.0 Agent 过程透明化 - Phase 3-5 实施跟踪

> **版本**: v4.0
> **功能名称**: process-transparency
> **文档类型**: 实施跟踪 (Implementation Track)
> **创建日期**: 2026-01-07

---

## 任务总览

| # | 任务 | 状态 | 依赖 |
|---|------|------|------|
| 1 | 创建类型定义 | ⬜ 待开始 | - |
| 2 | 实现事件人性化处理 | ⬜ 待开始 | 1 |
| 3 | 增强 SSE 端点 | ⬜ 待开始 | 1, 2 |
| 4 | 增强前端 Hook | ⬜ 待开始 | 1 |
| 5 | 实现 ProcessLog 组件 | ⬜ 待开始 | 1 |
| 6 | 集成到 Chat UI | ⬜ 待开始 | 4, 5 |
| 7 | 确保工具返回来源信息 | ⬜ 待开始 | - |
| 8 | 端到端测试 | ⬜ 待开始 | 3, 6, 7 |

---

## 任务详情

### 任务 1: 创建类型定义

**文件**: `/src/types/process-events.ts` (新建)

**内容**:
- `ProcessEventType` 类型
- `SourceReference` 接口
- `ProcessEvent` 接口

**验收标准**:
- [ ] 类型文件创建完成
- [ ] 导出到 `/src/types/index.ts`
- [ ] TypeScript 编译通过

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
- [ ] 所有 22 个财务工具有中文标签
- [ ] 搜索和提取工具有中文标签
- [ ] 年份/期间正确显示
- [ ] 错误消息人性化

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
- [ ] SSE 发送 `process` 事件
- [ ] 事件包含 `id`, `timestamp`, `type`, `content`
- [ ] 工具结果包含 `sourceReference`（如适用）
- [ ] 现有 `thinking`, `complete`, `error` 事件不受影响
- [ ] SSE 连接在整个 workflow 执行期间保持稳定

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
- [ ] `processEvents` 正确累积
- [ ] 新消息发送时清空旧事件
- [ ] 类型安全，无 `any`

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
- [ ] 折叠/展开正常工作
- [ ] 事件按顺序显示
- [ ] 图标正确对应事件类型
- [ ] 来源链接可点击跳转
- [ ] 样式符合设计规范

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
- [ ] ProcessLog 在 assistant 回复后显示
- [ ] 流式传输期间不显示 ProcessLog
- [ ] 与 ThinkingIndicator 不冲突

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
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
> - 在 `search_documents` 工具中，代码知道找到了哪些 chunks，直接返回该元数据
> - 在财务计算工具中，从 `financial_data` 表查询时保留文档引用

**验收标准**:
- [ ] 至少 3 个主要财务工具返回来源信息
- [ ] 来源信息能追溯到 `financial_data` 表记录
- [ ] `fileUrl` 正确指向原始文件（如有）
- [ ] `source` 由工具代码构建，非 LLM 生成

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
```

---

### 任务 8: 端到端测试

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
- [ ] 所有测试场景通过
- [ ] 无控制台错误
- [ ] 性能无明显下降

**实施记录**:
```
状态: ⬜ 待开始
开始时间: -
完成时间: -
备注: -
```

---

## 进度追踪

| 日期 | 完成任务 | 备注 |
|------|----------|------|
| - | - | - |

---

## 相关文档

- [Phase 1 PRD](./PHASE1_PRD.md)
- [Phase 2 设计文档](./PHASE2_DESIGN.md)

---

*文档创建: 2026-01-07*
*状态: 待实施*
