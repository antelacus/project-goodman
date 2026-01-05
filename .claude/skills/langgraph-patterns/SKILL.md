---
name: langgraph-patterns
description: Enforces LangGraph workflow conventions when working with agent workflows, state graphs, or files in src/lib/workflows/
---

# LangGraph Workflow Conventions

Apply these patterns when working with LangGraph code in this project.

## State Interface Rules

All LangGraph state interfaces must have explicit types - never use `any`:

```typescript
// CORRECT
interface UnifiedAgentState {
  messages: BaseMessage[];
  currentStep: 'loading' | 'processing' | 'responding';
  toolResults: Map<string, ToolResult>;
  sessionId: string;
}

// WRONG - any types
interface UnifiedAgentState {
  messages: any[];
  currentStep: any;
  toolResults: any;
}
```

## Graph Structure Pattern

Follow the established graph flow in `src/lib/workflows/unified/graph.ts`:

```
START → loadMemory → agentLoop ←→ toolExecutor
                         ↓
                    (if done)
                         ↓
              saveMemory → generateResponse → END
```

## Node Implementation

Nodes should be pure functions in `src/lib/workflows/core/`:

```typescript
// CORRECT - pure function, explicit types
export async function loadMemoryNode(
  state: UnifiedAgentState
): Promise<Partial<UnifiedAgentState>> {
  const memory = await loadSessionMemory(state.sessionId);
  return { messages: [...state.messages, ...memory] };
}

// WRONG - side effects, implicit types
export async function loadMemoryNode(state) {
  globalState.lastAccess = Date.now(); // Side effect!
  return { messages: state.messages };
}
```

## Conditional Edges

Use typed condition functions:

```typescript
// CORRECT
function shouldContinue(state: UnifiedAgentState): 'continue' | 'end' {
  if (state.currentStep === 'done') return 'end';
  return 'continue';
}

graph.addConditionalEdges('agentLoop', shouldContinue, {
  continue: 'toolExecutor',
  end: 'saveMemory',
});
```

## Tool Registration

Register tools once at module load, not per-request:

```typescript
// CORRECT - module-level registration
const toolRegistry = new ToolRegistry();
toolRegistry.register(financialTools);
toolRegistry.register(searchTools);

export function createGraph() {
  // Use pre-registered tools
}

// WRONG - per-request registration
export function createGraph() {
  const tools = new ToolRegistry();
  tools.register(financialTools); // Wasteful!
}
```

## Error Handling

Use the typed error hierarchy from `src/lib/errors/`:

```typescript
import { ToolExecutionError, InsufficientDataError } from '@/lib/errors';

try {
  const result = await executeTool(tool, input);
} catch (error) {
  if (error instanceof ToolExecutionError) {
    // Handle tool-specific error
    return { error: error.toJSON(), recoverable: error.recoverable };
  }
  throw error;
}
```

## Key Files Reference

- `src/lib/workflows/unified/graph.ts` - Main workflow graph
- `src/lib/workflows/core/` - Shared node implementations
- `src/lib/tools/registry.ts` - Tool registry (360 LOC)
- `src/lib/errors/base.ts` - Error class hierarchy
