/**
 * Event Humanization Utilities
 * v4.0: Process transparency feature
 *
 * Transforms technical LangGraph events into user-friendly Chinese descriptions
 * for display in the ProcessLog component.
 */

import { presetFunctions } from '@/lib/financial';

// ============================================================================
// Tool Label Mapping
// ============================================================================

/**
 * Build tool labels from preset functions + additional tools
 */
function buildToolLabels(): Record<string, string> {
  const labels: Record<string, string> = {};

  // Add all 22 preset financial functions
  presetFunctions.forEach((func) => {
    labels[func.name] = func.displayName;
  });

  // Additional financial tools
  labels['get_financial_metric'] = '获取财务指标';
  labels['query_financial_data'] = '查询财务数据';
  labels['calculate_financial_metric'] = '计算财务指标';

  // Search tools
  labels['search_documents'] = '搜索文档';
  labels['search_regulations'] = '查询法规';

  // Extraction tools
  labels['extract_document'] = '提取文档内容';

  return labels;
}

const TOOL_LABELS = buildToolLabels();

/**
 * Node name to Chinese label mapping
 */
const NODE_LABELS: Record<string, string> = {
  loadMemory: '加载对话历史',
  agentLoop: '分析问题',
  toolExecutor: '执行工具',
  saveMemory: '保存对话',
  generateResponse: '生成回复',
  __start__: '初始化',
  LangGraph: '处理中',
};

// ============================================================================
// Format Functions
// ============================================================================

/**
 * Format a tool call event into a human-friendly description
 */
export function formatToolCallEvent(toolName: string, input: Record<string, unknown>): string {
  const label = TOOL_LABELS[toolName] || toolName;

  // Extract year/period for context
  const year = input?.year;
  const period = input?.period;
  const metricName = input?.metric_name;
  const query = input?.query;

  // Build contextual description
  if (year && period && period !== 'annual') {
    return `正在计算 ${label} (${year}年${period})...`;
  }
  if (year) {
    return `正在计算 ${label} (${year}年)...`;
  }
  if (metricName) {
    return `正在查询 "${metricName}"...`;
  }
  if (query) {
    return `正在搜索 "${String(query).substring(0, 20)}${String(query).length > 20 ? '...' : ''}"...`;
  }

  return `正在执行 ${label}...`;
}

/**
 * Format a tool result event into a human-friendly description
 */
export function formatToolResultEvent(
  toolName: string,
  output: Record<string, unknown>
): string {
  const label = TOOL_LABELS[toolName] || toolName;

  // Check for errors
  if (output?.success === false) {
    const errorMsg = output?.error || '未知错误';
    return `${label} 执行失败: ${String(errorMsg).substring(0, 50)}`;
  }

  // Extract result data
  const data = output?.data as Record<string, unknown> | undefined;

  // For financial calculations with numeric result
  if (data && 'value' in data && typeof data.value === 'number') {
    const formatted = data.formatted || formatValue(data.value, data.unit as string);
    return `${label} = ${formatted}`;
  }

  // For search results
  if (data && 'total' in data) {
    return `${label} 完成，找到 ${data.total} 条结果`;
  }

  // For query results
  if (data && 'metrics' in data) {
    const metrics = data.metrics as Record<string, unknown>;
    const count = Object.keys(metrics).length;
    return `${label} 完成，获取到 ${count} 个指标`;
  }

  return `${label} 完成`;
}

/**
 * Format a thinking/node event into a human-friendly description
 */
export function formatThinkingEvent(nodeName: string): string {
  return NODE_LABELS[nodeName] || `处理中 (${nodeName})...`;
}

/**
 * Format an error event into a human-friendly description
 */
export function formatErrorEvent(error: unknown): string {
  if (error instanceof Error) {
    return `错误: ${error.message}`;
  }
  if (typeof error === 'string') {
    return `错误: ${error}`;
  }
  return '发生未知错误';
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a numeric value with unit
 */
function formatValue(value: number, unit?: string): string {
  // Format based on unit type
  if (unit === '%') {
    return `${(value * 100).toFixed(2)}%`;
  }
  if (unit === '倍' || unit === '次') {
    return `${value.toFixed(2)}${unit}`;
  }
  if (unit === '天') {
    return `${value.toFixed(0)}天`;
  }
  if (unit === '元') {
    return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  }

  // Default numeric format
  return value.toFixed(2);
}

/**
 * Get the Chinese label for a tool name
 */
export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

/**
 * Check if a tool name is a known financial calculation tool
 */
export function isFinancialTool(toolName: string): boolean {
  return presetFunctions.some((f) => f.name === toolName) ||
    ['get_financial_metric', 'query_financial_data', 'calculate_financial_metric'].includes(toolName);
}
