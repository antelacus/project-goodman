/**
 * Financial Utility Tools
 *
 * Non-preset financial tools for flexible queries and calculations:
 * - query_financial_data: Query multiple metrics across multiple years
 * - evaluate_expression: Calculate arithmetic expressions with verified code
 */

import { z } from "zod";
import { evaluate } from "mathjs";
import type { Tool, ToolExecutionResult } from "../types";
import {
  QueryFinancialDataInputSchema,
  QueryFinancialDataOutputSchema,
} from "../types";
import { toolRegistry } from "../registry";
import { queryFinancialData } from "../../services/financial-data";

// ============================================================================
// Query Financial Data Tool
// ============================================================================

/**
 * Enhanced query tool supporting multiple metrics and multiple years.
 * Returns flat list format for easier LLM parsing.
 */
export const queryFinancialDataTool: Tool = {
  name: "query_financial_data",
  displayName: "查询财务数据",
  displayNameEn: "Query Financial Data",
  description:
    "查询多个财务指标的数据，支持同时查询多个指标和多个年份。返回扁平列表格式，每条记录包含完整上下文（年份、指标名、数值、单位、来源）。用于获取原始财务数值，如资产总计、负债总计、净利润等。",
  category: "query",
  inputSchema: QueryFinancialDataInputSchema,
  outputSchema: QueryFinancialDataOutputSchema,

  execute: async (input): Promise<ToolExecutionResult> => {
    const { metric_names, years, period } = input as {
      metric_names: string[];
      years?: string[];
      period?: string;
    };

    try {
      // Default to current year if no years specified
      const yearsToQuery = years || [new Date().getFullYear().toString()];
      const allResults: Array<{
        year: string;
        metric: string;
        value: number;
        unit: string;
        source: string;
        period: string;
      }> = [];
      const foundMetrics = new Set<string>();

      // Query each year sequentially
      for (const year of yearsToQuery) {
        const data = await queryFinancialData(
          metric_names,
          year,
          period || "annual"
        );
        data.forEach((d) => {
          allResults.push({
            year: d.year,
            metric: d.metric_name,
            value: d.metric_value,
            unit: d.unit,
            source: d.documents.name,
            period: d.period,
          });
          foundMetrics.add(d.metric_name);
        });
      }

      // Calculate missing metrics
      const missing = metric_names.filter((m) => !foundMetrics.has(m));

      return {
        success: true,
        data: {
          results: allResults,
          missing,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Query failed",
      };
    }
  },
};

// ============================================================================
// Evaluate Expression Tool
// ============================================================================

/**
 * For evaluating arithmetic expressions with verified code execution.
 * Use this when you need to calculate differences, growth rates, or other
 * arithmetic between values (e.g., comparing metrics across years).
 */
export const evaluateExpressionTool: Tool = {
  name: "evaluate_expression",
  displayName: "计算表达式",
  displayNameEn: "Evaluate Expression",
  description:
    '使用代码计算数学表达式。当需要计算增长率、差值、百分比变化等数值运算时调用此函数。例如：计算"资产负债率从60%增长到65%，增长了多少"、"2024年比2023年增长了多少百分比"等。支持 +, -, *, /, %, ^（幂）运算符和括号。',
  category: "financial",
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        '数学表达式字符串，例如 "(65 - 60) / 60 * 100" 或 "1500000 / 1200000 - 1"。支持变量替换。'
      ),
    variables: z
      .record(z.union([z.number(), z.string()]))
      .optional()
      .describe(
        '变量值映射，例如 {"current": 65, "previous": 60}。表达式中可使用这些变量名。'
      ),
    description: z
      .string()
      .optional()
      .describe("计算说明，用于结果展示，例如 '资产负债率增长百分比'。"),
  }),
  outputSchema: z.object({
    result: z.number(),
    formatted: z.string(),
    expression: z.string(),
    description: z.string().optional(),
  }),

  execute: async (input): Promise<ToolExecutionResult> => {
    const { expression, variables: rawVariables, description } = input as {
      expression: string;
      variables?: Record<string, number | string>;
      description?: string;
    };

    try {
      // Normalize variables: convert string numbers to actual numbers
      const variables: Record<string, number> = {};
      if (rawVariables) {
        for (const [key, value] of Object.entries(rawVariables)) {
          if (typeof value === "number") {
            variables[key] = value;
          } else if (typeof value === "string") {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
              return {
                success: false,
                error: `变量 "${key}" 的值 "${value}" 不是有效数字`,
              };
            }
            variables[key] = parsed;
          }
        }
      }

      // Evaluate the expression using mathjs
      // mathjs.evaluate returns number | Matrix | BigNumber, but our expressions are simple arithmetic
      const result = evaluate(expression, variables) as number;

      // Format the result based on magnitude
      let formatted: string;
      if (Math.abs(result) >= 10000) {
        formatted = result.toLocaleString("zh-CN", {
          maximumFractionDigits: 2,
        });
      } else if (Math.abs(result) < 0.01 && result !== 0) {
        formatted = result.toExponential(2);
      } else {
        formatted = result.toLocaleString("zh-CN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        });
      }

      // Build display expression with substituted values
      let displayExpr = expression;
      if (variables) {
        for (const [name, value] of Object.entries(variables)) {
          displayExpr = displayExpr.replace(
            new RegExp(`\\b${name}\\b`, "g"),
            value.toLocaleString("zh-CN")
          );
        }
      }

      return {
        success: true,
        data: {
          result,
          formatted,
          expression: displayExpr,
          description,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? `表达式计算失败: ${error.message}`
            : "表达式计算失败",
      };
    }
  },
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all utility tools in the registry
 */
export function registerUtilityTools(): void {
  if (!toolRegistry.has(queryFinancialDataTool.name)) {
    toolRegistry.register(queryFinancialDataTool);
  }
  if (!toolRegistry.has(evaluateExpressionTool.name)) {
    toolRegistry.register(evaluateExpressionTool);
  }
}

// ============================================================================
// OpenAI Function Definition Builder
// ============================================================================

/**
 * Build OpenAI-compatible function definitions for guidance chat workflow
 */
export function buildGuidanceChatFunctionDefs(
  availableMetricsList: string
): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}> {
  return [
    {
      type: "function" as const,
      function: {
        name: "query_financial_data",
        description: `查询多个财务指标的数据，支持同时查询多个指标和多个年份。返回扁平列表格式。可用指标包括: ${availableMetricsList}。用于获取原始财务数值。`,
        parameters: {
          type: "object",
          properties: {
            metric_names: {
              type: "array",
              items: { type: "string" },
              description:
                '要查询的财务指标名称列表（使用精确中文名称，如 "资产总计", "负债总计", "流动资产合计"）',
            },
            years: {
              type: "array",
              items: { type: "string" },
              description:
                '要查询的年份数组，如 ["2023", "2024"]。如果未指定，返回当前年份数据。',
            },
            period: {
              type: "string",
              description:
                '会计期间: "annual", "Q1", "Q2", "Q3", "Q4"。默认为 "annual"。',
            },
          },
          required: ["metric_names"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "evaluate_expression",
        description:
          '使用代码计算数学表达式。当需要计算增长率、差值、百分比变化时调用此函数。例如："资产负债率从60%增长到65%，增长了多少百分点"、"2024年比2023年增长了多少百分比"。这个工具使用验证过的代码执行计算，而不是 LLM 推测。',
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description:
                '数学表达式，例如 "(65 - 60)" 或 "(1500000 - 1200000) / 1200000 * 100"',
            },
            variables: {
              type: "object",
              description:
                '可选的变量映射，例如 {"current": 65, "previous": 60}',
            },
            description: {
              type: "string",
              description: "计算说明，用于结果展示",
            },
          },
          required: ["expression"],
        },
      },
    },
  ];
}
