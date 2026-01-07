# v4.0 Agent 过程透明化 - Phase 2 设计文档

> **版本**: v4.0
> **功能名称**: process-transparency
> **文档类型**: 设计文档 (Design Document)
> **创建日期**: 2026-01-07

---

## 1. 现有架构分析

### 1.1 SSE 流式传输（v3.6 基础设施）

**后端**: `/src/app/api/chat/stream/route.ts`

```
POST /api/chat/stream
  ↓
unifiedAgentGraph.streamEvents(state, { version: 'v2' })
  ↓
┌─────────────────────────────────────────────┐
│ LangGraph 事件监听                           │
├─────────────────────────────────────────────┤
│ on_chain_start → sendEvent('thinking', ...) │
│ on_tool_start  → sendEvent('tool_call', ...)│
│ on_tool_end    → sendEvent('tool_result',.) │
│ Graph 完成     → sendEvent('complete', ...) │
│ 异常           → sendEvent('error', ...)    │
└─────────────────────────────────────────────┘
```

**前端**: `/src/hooks/useStreamingChat.ts`

```typescript
// 当前事件类型
type StreamEventType = 'thinking' | 'tool_call' | 'tool_result' | 'complete' | 'error';

// 事件存储在 events 数组中，但未在 UI 中展示
const [events, setEvents] = useState<StreamEvent[]>([]);
```

### 1.2 LangGraph 工作流节点

**位置**: `/src/lib/workflows/`

| 节点 | 文件 | 职责 |
|------|------|------|
| `loadMemory` | `core/nodes/load-memory.ts` | 加载会话历史和文档上下文 |
| `agentLoop` | `core/nodes/agent-loop.ts` | LLM 推理循环，决定工具调用 |
| `toolExecutor` | `core/nodes/tool-executor.ts` | 执行工具，记录结果 |
| `saveMemory` | `core/nodes/save-memory.ts` | 持久化对话消息 |
| `generateResponse` | `core/nodes/generate-response.ts` | 提取最终回复 |

### 1.3 当前 Chat UI 组件

```
ChatWorkspace
├── MessageList
│   ├── User message bubbles
│   ├── Assistant message bubbles
│   └── ThinkingIndicator (当前节点状态)
└── ChatInput
```

**关键发现**:
- `useStreamingChat` hook 已捕获 `events` 数组
- `events` 包含 `tool_call` 和 `tool_result`，但未传递给 UI
- `ThinkingIndicator` 仅显示当前节点名称，不显示历史

---

## 2. 设计方案

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (Backend)                            │
├─────────────────────────────────────────────────────────────────┤
│  LangGraph Workflow Nodes                                       │
│    ├─ loadMemory: 发射 context_loaded 事件                      │
│    ├─ agentLoop: 发射 thinking, tool_decision 事件              │
│    ├─ toolExecutor: 发射 tool_start, tool_end, data_fetch 事件  │
│    └─ generateResponse: 发射 calculation, result 事件           │
│                          ↓                                      │
│  ProcessEventEmitter (新增)                                      │
│    ├─ 收集原始事件                                               │
│    ├─ 调用 formatEventForUI() 人性化处理                         │
│    └─ 通过 SSE 发送到前端                                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓ SSE
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Frontend)                           │
├─────────────────────────────────────────────────────────────────┤
│  useStreamingChat Hook                                          │
│    ├─ 解析 SSE 事件                                              │
│    ├─ 分类: process 事件 → processEvents 数组                   │
│    └─ 传递给 ChatWorkspace                                       │
│                          ↓                                      │
│  ChatWorkspace                                                  │
│    └─ MessageList                                               │
│        ├─ Message bubbles                                       │
│        ├─ ProcessLog (新增) ← processEvents                     │
│        └─ ThinkingIndicator                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 事件类型定义

**新增类型文件**: `/src/types/process-events.ts`

```typescript
// 过程事件类型
export type ProcessEventType =
  | 'thinking'      // Agent 思考/推理
  | 'tool_call'     // 工具调用开始
  | 'tool_result'   // 工具返回结果
  | 'data_fetch'    // 数据获取（带来源）
  | 'calculation'   // 计算步骤
  | 'error';        // 错误

// 数据来源引用
export interface SourceReference {
  documentId: string;
  documentName: string;
  documentType: string;
  year?: string;
  period?: string;
  fileUrl?: string;
}

// 过程事件
export interface ProcessEvent {
  id: string;                         // UUID v4
  timestamp: number;                  // Unix timestamp
  type: ProcessEventType;
  content: string;                    // 人性化描述
  details?: Record<string, unknown>;  // 原始技术信息
  sourceReference?: SourceReference;  // 数据来源
}
```

### 2.3 后端：事件发射器

**新增文件**: `/src/lib/workflows/shared/process-event-emitter.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import { ProcessEvent, ProcessEventType, SourceReference } from '@/types/process-events';

// 事件发射器（每次请求一个实例）
export class ProcessEventEmitter {
  private events: ProcessEvent[] = [];
  private readonly maxEvents = 50;

  emit(
    type: ProcessEventType,
    content: string,
    details?: Record<string, unknown>,
    sourceReference?: SourceReference
  ): ProcessEvent {
    const event: ProcessEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      content,
      details,
      sourceReference
    };

    if (this.events.length < this.maxEvents) {
      this.events.push(event);
    }

    return event;
  }

  getEvents(): ProcessEvent[] {
    return [...this.events];
  }
}
```

### 2.4 后端：事件人性化处理

**新增文件**: `/src/lib/workflows/shared/format-event.ts`

```typescript
import { METRIC_NAMES } from '@/lib/financial/metric-names';

interface RawToolCall {
  tool: string;
  input: Record<string, unknown>;
}

interface RawToolResult {
  tool: string;
  output: Record<string, unknown>;
}

// 工具名称 → 中文描述
const TOOL_LABELS: Record<string, string> = {
  // 财务计算工具
  current_ratio: '流动比率',
  quick_ratio: '速动比率',
  debt_to_equity: '资产负债率',
  roe: '净资产收益率',
  roa: '总资产收益率',
  // ... 其他 22 个指标

  // 搜索工具
  search_documents: '文档搜索',
  search_regulations: '法规查询',

  // 提取工具
  extract_financial_data: '财务数据提取'
};

// 格式化工具调用事件
export function formatToolCallEvent(raw: RawToolCall): string {
  const label = TOOL_LABELS[raw.tool] || raw.tool;
  const year = raw.input.year || raw.input.period;

  if (year) {
    return `正在计算 ${label} (${year}年)...`;
  }
  return `正在执行 ${label}...`;
}

// 格式化工具结果事件
export function formatToolResultEvent(raw: RawToolResult): string {
  const label = TOOL_LABELS[raw.tool] || raw.tool;
  const output = raw.output as { success?: boolean; data?: unknown; error?: string };

  if (!output.success) {
    return `${label} 执行失败: ${output.error || '未知错误'}`;
  }

  // 对于财务计算，显示结果值
  if (output.data && typeof output.data === 'object') {
    const data = output.data as Record<string, unknown>;
    if ('value' in data && typeof data.value === 'number') {
      return `${label} = ${data.value.toFixed(2)}`;
    }
  }

  return `${label} 完成`;
}

// 格式化思考事件
export function formatThinkingEvent(node: string): string {
  const NODE_LABELS: Record<string, string> = {
    loadMemory: '加载对话历史...',
    agentLoop: '分析问题...',
    toolExecutor: '执行计算...',
    saveMemory: '保存对话...',
    generateResponse: '生成回复...',
    __start__: '初始化...'
  };

  return NODE_LABELS[node] || `处理中 (${node})...`;
}
```

### 2.5 后端：SSE 端点增强

**修改文件**: `/src/app/api/chat/stream/route.ts`

```typescript
// 增强 sendEvent 函数，添加 process 事件类型
const sendEvent = (type: string, data: any) => {
  const formattedData = JSON.stringify(data);
  controller.enqueue(`event: ${type}\ndata: ${formattedData}\n\n`);
};

// 在事件处理中增加人性化转换
if (event.event === 'on_tool_start') {
  const humanized = formatToolCallEvent({
    tool: event.name,
    input: event.data.input
  });

  sendEvent('process', {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'tool_call',
    content: humanized,
    details: { tool: event.name, input: event.data.input }
  });
}

if (event.event === 'on_tool_end') {
  const humanized = formatToolResultEvent({
    tool: event.name,
    output: event.data.output
  });

  // 如果工具返回了数据来源，附加 sourceReference
  const sourceRef = extractSourceReference(event.data.output);

  sendEvent('process', {
    id: uuidv4(),
    timestamp: Date.now(),
    type: 'tool_result',
    content: humanized,
    details: { tool: event.name, output: event.data.output },
    sourceReference: sourceRef
  });
}
```

### 2.6 前端：Hook 增强

**修改文件**: `/src/hooks/useStreamingChat.ts`

```typescript
// 新增状态
const [processEvents, setProcessEvents] = useState<ProcessEvent[]>([]);

// 在事件处理中分类
const handleEvent = (type: StreamEventType, data: any) => {
  if (type === 'process') {
    // 过程事件追加到专用数组
    setProcessEvents(prev => [...prev, data as ProcessEvent]);
  } else if (type === 'thinking') {
    setCurrentThinking(data.node);
  } else if (type === 'complete') {
    // 完成时保留 processEvents 供展示
    setCurrentThinking(null);
    onComplete?.(data);
  }
  // ... 其他处理
};

// 返回 processEvents
return {
  sendMessage,
  isStreaming,
  currentThinking,
  sessionId,
  events,
  processEvents,  // 新增
};
```

### 2.7 前端：ProcessLog 组件

**新增文件**: `/src/components/chat/ProcessLog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ProcessEvent } from '@/types/process-events';

interface ProcessLogProps {
  events: ProcessEvent[];
  defaultExpanded?: boolean;
}

// 事件类型图标映射
const EVENT_ICONS: Record<string, string> = {
  thinking: '🤔',
  tool_call: '🔧',
  tool_result: '✅',
  data_fetch: '📄',
  calculation: '📊',
  error: '❌'
};

export function ProcessLog({ events, defaultExpanded = false }: ProcessLogProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (events.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50">
      {/* 折叠按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>查看计算过程 ({events.length} 步)</span>
      </button>

      {/* 展开的事件列表 */}
      {isExpanded && (
        <div className="border-t border-neutral-200 px-3 py-2 space-y-2">
          {events.map((event) => (
            <ProcessEventItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessEventItem({ event }: { event: ProcessEvent }) {
  const icon = EVENT_ICONS[event.type] || '•';
  const isError = event.type === 'error';

  return (
    <div className={`text-sm ${isError ? 'text-red-600' : 'text-neutral-700'}`}>
      <div className="flex items-start gap-2">
        <span>{icon}</span>
        <div className="flex-1">
          <span>{event.content}</span>

          {/* 数据来源链接 */}
          {event.sourceReference && (
            <SourceLink source={event.sourceReference} />
          )}
        </div>
      </div>
    </div>
  );
}

function SourceLink({ source }: { source: SourceReference }) {
  const displayText = source.year
    ? `${source.year}年${source.documentType}`
    : source.documentName;

  const href = source.fileUrl || `/documents?id=${source.documentId}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-2 text-blue-600 hover:text-blue-800 hover:underline"
    >
      [{displayText}]
    </a>
  );
}
```

### 2.8 组件集成

**修改文件**: `/src/components/chat/MessageList.tsx`

```typescript
import { ProcessLog } from './ProcessLog';
import { ProcessEvent } from '@/types/process-events';

interface MessageListProps {
  messages: ChatMessage[];
  currentThinking?: string | null;
  isLoading?: boolean;
  processEvents?: ProcessEvent[];  // 新增
}

export function MessageList({
  messages,
  currentThinking,
  isLoading,
  processEvents = []
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* 消息列表 */}
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* 过程日志（最后一条 assistant 消息后） */}
      {processEvents.length > 0 && !currentThinking && (
        <ProcessLog events={processEvents} />
      )}

      {/* 思考指示器 */}
      {currentThinking && (
        <ThinkingIndicator currentNode={currentThinking} />
      )}
    </div>
  );
}
```

**修改文件**: `/src/components/chat/ChatWorkspace.tsx`

```typescript
const {
  sendMessage,
  isStreaming,
  currentThinking,
  sessionId,
  processEvents  // 新增
} = useStreamingChat({ /* ... */ });

// 传递给 MessageList
<MessageList
  messages={messages}
  currentThinking={currentThinking}
  processEvents={processEvents}
/>
```

---

## 3. 数据来源链接实现

### 3.1 来源信息提取

财务计算工具已返回数据来源信息。需要在 `extractSourceReference()` 函数中提取：

```typescript
function extractSourceReference(output: unknown): SourceReference | undefined {
  if (!output || typeof output !== 'object') return undefined;

  const data = output as Record<string, unknown>;

  // 从工具输出中提取来源信息
  if (data.source && typeof data.source === 'object') {
    const source = data.source as Record<string, unknown>;
    return {
      documentId: String(source.documentId || ''),
      documentName: String(source.documentName || ''),
      documentType: String(source.documentType || ''),
      year: source.year ? String(source.year) : undefined,
      fileUrl: source.fileUrl ? String(source.fileUrl) : undefined
    };
  }

  return undefined;
}
```

### 3.2 工具输出增强

需要确保财务计算工具返回来源信息。检查 `/src/lib/tools/financial/` 中的工具实现，确保返回格式包含：

```typescript
{
  success: true,
  data: {
    value: 2.15,
    // ... 其他计算结果
  },
  source: {
    documentId: 'uuid',
    documentName: '资产负债表',
    documentType: 'balance_sheet',
    year: '2024'
  }
}
```

---

## 4. 错误处理设计

### 4.1 错误事件格式

```typescript
// 错误发生时发送两个事件
sendEvent('process', {
  id: uuidv4(),
  timestamp: Date.now(),
  type: 'error',
  content: '数据获取失败: 连接超时',  // 技术描述
  details: { error: e.message, stack: e.stack }
});

sendEvent('error', {
  message: '抱歉，获取财务数据时遇到问题。请检查网络连接或稍后重试。'  // 用户友好
});
```

### 4.2 前端错误展示

- **ProcessLog 中**: 显示红色 ❌ 图标和技术错误描述
- **主聊天气泡**: 显示友好的错误提示和建议

---

## 5. 性能考虑

| 方面 | 策略 |
|------|------|
| 事件数量 | 单次请求最多 50 条事件 |
| 事件大小 | `details` 字段仅包含必要信息，不含完整响应 |
| 渲染性能 | `ProcessLog` 使用虚拟化列表（如事件 > 20 条） |
| 内存 | 请求完成后清理 `processEvents` 状态 |

---

## 6. 文件变更清单

### 6.1 新增文件

| 文件 | 用途 |
|------|------|
| `/src/types/process-events.ts` | 过程事件类型定义 |
| `/src/lib/workflows/shared/process-event-emitter.ts` | 事件发射器类 |
| `/src/lib/workflows/shared/format-event.ts` | 事件人性化处理 |
| `/src/components/chat/ProcessLog.tsx` | 过程日志 UI 组件 |

### 6.2 修改文件

| 文件 | 变更 |
|------|------|
| `/src/app/api/chat/stream/route.ts` | 增强事件发送，添加人性化处理 |
| `/src/hooks/useStreamingChat.ts` | 添加 `processEvents` 状态 |
| `/src/components/chat/MessageList.tsx` | 集成 ProcessLog 组件 |
| `/src/components/chat/ChatWorkspace.tsx` | 传递 processEvents 到 MessageList |
| `/src/components/chat/index.ts` | 导出 ProcessLog |

---

## 7. 相关文档

- [Phase 1 PRD](./PHASE1_PRD.md)
- [Phase 3-5 实施跟踪](./PHASE3-5_TRACK.md) (待创建)

---

*文档创建: 2026-01-07*
*状态: 待审批*
