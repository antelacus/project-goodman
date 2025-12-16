/**
 * Tool Types for Unified Tool System
 *
 * Provides type definitions for the tool registry system that:
 * - Unifies tool interfaces across workflows
 * - Enables conversion to OpenAI function definitions
 * - Prepares for LangGraph ToolNode migration
 */

import { z } from "zod";
import type OpenAI from "openai";

// ============================================================================
// Core Types
// ============================================================================

/**
 * Tool categories for organization and filtering
 */
export type ToolCategory =
  | "financial" // Financial calculation tools (from preset-functions)
  | "search" // Database and vector search tools
  | "extraction" // Document/data extraction tools
  | "storage" // File storage operations
  | "query"; // Data query tools

/**
 * Metadata for financial tools
 */
export interface FinancialToolMetadata {
  /** Financial metric names required as inputs */
  requiredInputs: string[];
  /** Formula display string */
  formulaDisplay: string;
  /** Result unit (%, 倍, 次, 元) */
  unit: string;
  /** Function category (liquidity, solvency, etc.) */
  financialCategory: string;
}

/**
 * Generic tool metadata
 */
export interface ToolMetadata {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Whether the tool can be retried on failure */
  retryable?: boolean;
  /** Financial-specific metadata */
  financial?: FinancialToolMetadata;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Core Tool interface
 *
 * All tools in the registry must implement this interface.
 * The generic types TInput and TOutput provide type safety for execute().
 */
export interface Tool<TInput = unknown, TOutput = unknown> {
  /** Unique identifier for the tool */
  name: string;

  /** Human-readable display name (Chinese) */
  displayName: string;

  /** Human-readable display name (English) */
  displayNameEn: string;

  /** Tool description for LLM understanding */
  description: string;

  /** Category for organization */
  category: ToolCategory;

  /** Zod schema for input validation */
  inputSchema: z.ZodSchema<TInput>;

  /** Zod schema for output validation */
  outputSchema: z.ZodSchema<TOutput>;

  /** Execute the tool with validated input */
  execute: (input: TInput) => Promise<ToolExecutionResult<TOutput>>;

  /** Optional metadata */
  metadata?: ToolMetadata;
}

// ============================================================================
// OpenAI Integration Types
// ============================================================================

/**
 * OpenAI function parameter schema
 * Includes index signature for compatibility with OpenAI's FunctionParameters
 */
export interface OpenAIParameterSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      items?: { type: string };
    }
  >;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Options for converting tools to OpenAI format
 */
export interface ToOpenAIOptions {
  /** Include detailed descriptions */
  detailed?: boolean;
  /** Filter by category */
  category?: ToolCategory;
  /** Custom parameter overrides */
  parameterOverrides?: Record<string, OpenAIParameterSchema>;
}

// ============================================================================
// Financial Tool Specific Types
// ============================================================================

/**
 * Standard input for financial calculation tools
 */
export const FinancialToolInputSchema = z.object({
  year: z
    .string()
    .optional()
    .describe("财务年份，例如 '2024' 或 '2025'。如果未指定，使用最新数据。"),
  period: z
    .string()
    .optional()
    .describe("会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。"),
  documentIds: z
    .array(z.string())
    .optional()
    .describe("指定的文档ID列表，用于限制数据来源。"),
});

export type FinancialToolInput = z.infer<typeof FinancialToolInputSchema>;

/**
 * Standard output for financial calculation tools
 */
export const FinancialToolOutputSchema = z.object({
  value: z.number().describe("计算结果数值"),
  formatted: z.string().describe("格式化后的结果字符串"),
  warnings: z.array(z.string()).optional().describe("计算警告信息"),
  inputs: z.record(z.number()).describe("计算使用的输入数据"),
  formula: z.string().describe("计算公式"),
  steps: z.array(z.string()).optional().describe("计算步骤"),
});

export type FinancialToolOutput = z.infer<typeof FinancialToolOutputSchema>;

// ============================================================================
// Query Tool Specific Types
// ============================================================================

/**
 * Input schema for financial data query tool
 */
export const QueryFinancialDataInputSchema = z.object({
  metric_names: z
    .array(z.string())
    .describe("要查询的财务指标名称列表（使用精确中文名称）"),
  year: z.string().optional().describe("财务年份"),
  period: z.string().optional().describe("会计期间"),
});

export type QueryFinancialDataInput = z.infer<
  typeof QueryFinancialDataInputSchema
>;

/**
 * Output schema for financial data query tool
 */
export const QueryFinancialDataOutputSchema = z.object({
  data: z.record(
    z.object({
      value: z.number(),
      unit: z.string(),
      source: z.string(),
    })
  ),
  missing: z.array(z.string()).describe("未找到的指标"),
});

export type QueryFinancialDataOutput = z.infer<
  typeof QueryFinancialDataOutputSchema
>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a tool has financial metadata
 */
export function isFinancialTool(
  tool: Tool
): tool is Tool & { metadata: { financial: FinancialToolMetadata } } {
  return tool.category === "financial" && !!tool.metadata?.financial;
}

/**
 * Check if an object is a valid Tool
 */
export function isTool(obj: unknown): obj is Tool {
  if (!obj || typeof obj !== "object") return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.name === "string" &&
    typeof t.displayName === "string" &&
    typeof t.description === "string" &&
    typeof t.category === "string" &&
    typeof t.execute === "function"
  );
}

// ============================================================================
// Re-export OpenAI types for convenience
// ============================================================================

export type ChatCompletionTool = OpenAI.Chat.ChatCompletionTool;
export type ChatCompletionToolChoiceOption =
  OpenAI.Chat.ChatCompletionToolChoiceOption;
