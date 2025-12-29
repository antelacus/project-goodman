/**
 * Financial Utility Tools
 *
 * Non-preset financial tools for flexible queries and calculations:
 * - get_financial_metric: Query specific metrics by year
 * - query_financial_data: Batch query multiple metrics
 * - calculate_financial_metric: Execute preset calculations with provided data
 */

import { z } from "zod";
import { presetFunctions, executeFunction } from "@/lib/financial";
import type { Tool, ToolExecutionResult } from "../types";
import {
  QueryFinancialDataInputSchema,
  QueryFinancialDataOutputSchema,
} from "../types";
import { toolRegistry } from "../registry";
import { queryFinancialData } from "../../services/financial-data";

// ============================================================================
// Get Financial Metric Tool
// ============================================================================

/**
 * For querying specific financial metrics not covered by preset functions,
 * or for retrieving raw data for comparisons/growth calculations.
 */
export const getFinancialMetricTool: Tool = {
  name: "get_financial_metric",
  displayName: "获取财务指标",
  displayNameEn: "Get Financial Metric",
  description:
    '获取特定财务指标在指定年份的数据。当用户询问的指标不在预设函数列表中（如"销售商品收到的现金"、"研发费用"等），或者需要计算增长率、同比变化时，使用此函数。',
  category: "query",
  inputSchema: z.object({
    metric_name: z
      .string()
      .describe(
        '财务指标的标准中文名称，例如"销售商品、提供劳务收到的现金"、"研发费用"。'
      ),
    years: z
      .array(z.string())
      .describe('需要查询的年份列表，例如 ["2023", "2024"]。'),
    period: z
      .string()
      .optional()
      .describe("会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。"),
  }),
  outputSchema: z.object({
    data: z.record(z.number()).describe("各年份的指标值"),
    unit: z.string().describe("指标单位"),
    source: z.string().describe("数据来源"),
  }),

  execute: async (input): Promise<ToolExecutionResult> => {
    const { metric_name, years, period } = input as {
      metric_name: string;
      years: string[];
      period?: string;
    };

    try {
      const data = await queryFinancialData(
        [metric_name],
        undefined,
        period || "annual"
      );
      const relevantData = data.filter((d) => years.includes(d.year));

      if (relevantData.length === 0) {
        return {
          success: false,
          error: `No data found for metric '${metric_name}' in years ${years.join(", ")}`,
        };
      }

      const yearMap: Record<string, number> = {};
      relevantData.forEach((d) => {
        yearMap[d.year] = d.metric_value;
      });

      return {
        success: true,
        data: {
          data: yearMap,
          unit: relevantData[0].unit,
          source: relevantData[0].documents.name,
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
// Query Financial Data Tool
// ============================================================================

/**
 * For querying multiple financial metrics at once.
 * Used by guidance-chat for tool-augmented responses.
 */
export const queryFinancialDataTool: Tool = {
  name: "query_financial_data",
  displayName: "查询财务数据",
  displayNameEn: "Query Financial Data",
  description:
    "Query structured financial data from the database. Use this to get specific financial metrics like 资产总计, 负债总计, 流动资产合计, 净利润 etc. Always use this tool first to get actual financial data before performing calculations.",
  category: "query",
  inputSchema: QueryFinancialDataInputSchema,
  outputSchema: QueryFinancialDataOutputSchema,

  execute: async (input): Promise<ToolExecutionResult> => {
    const { metric_names, year, period } = input as {
      metric_names: string[];
      year?: string;
      period?: string;
    };

    try {
      const data = await queryFinancialData(metric_names, year, period);

      const metrics: Record<
        string,
        { value: number; unit: string; source: string; year: string; period: string }
      > = {};

      data.forEach((d) => {
        metrics[d.metric_name] = {
          value: d.metric_value,
          unit: d.unit,
          source: d.documents.name,
          year: d.year,
          period: d.period,
        };
      });

      return {
        success: true,
        data: {
          metrics,
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
// Calculate Financial Metric Tool
// ============================================================================

/**
 * Execute a preset financial calculation with provided data.
 * Used by guidance-chat after querying data.
 */
export const calculateFinancialMetricTool: Tool = {
  name: "calculate_financial_metric",
  displayName: "计算财务指标",
  displayNameEn: "Calculate Financial Metric",
  description:
    "Calculate a financial metric using a preset formula. Use this AFTER you have retrieved the required data using query_financial_data.",
  category: "financial",
  inputSchema: z.object({
    metric_name: z
      .enum(presetFunctions.map((f) => f.name) as [string, ...string[]])
      .describe("预设财务指标名称"),
    inputs: z.record(z.number()).describe("计算所需的输入数据"),
  }),
  outputSchema: z.object({
    value: z.number(),
    formatted: z.string(),
    warnings: z.array(z.string()).optional(),
    displayName: z.string(),
    formula: z.string(),
    interpretation: z.string(),
  }),

  execute: async (input): Promise<ToolExecutionResult> => {
    const { metric_name, inputs } = input as {
      metric_name: string;
      inputs: Record<string, number>;
    };

    try {
      const result = executeFunction(metric_name, inputs);
      return {
        success: true,
        data: {
          value: result.result.value,
          formatted: result.result.formatted,
          warnings: result.result.warnings,
          displayName: result.displayName,
          formula: result.formulaDisplay,
          interpretation: result.interpretation,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Calculation failed",
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
  if (!toolRegistry.has(getFinancialMetricTool.name)) {
    toolRegistry.register(getFinancialMetricTool);
  }
  if (!toolRegistry.has(queryFinancialDataTool.name)) {
    toolRegistry.register(queryFinancialDataTool);
  }
  if (!toolRegistry.has(calculateFinancialMetricTool.name)) {
    toolRegistry.register(calculateFinancialMetricTool);
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
        description: `Query structured financial data from the database. Use this to get specific financial metrics like 资产总计, 负债总计, 流动资产合计, 净利润 etc. Available metrics include: ${availableMetricsList}. Always use this tool first to get actual financial data before performing calculations.`,
        parameters: {
          type: "object",
          properties: {
            metric_names: {
              type: "array",
              items: { type: "string" },
              description:
                'List of financial metric names to query (use exact Chinese names like "资产总计", "负债总计", "流动资产合计")',
            },
            year: {
              type: "string",
              description:
                'Financial year to query (e.g., "2024", "2023"). If not specified, returns most recent data.',
            },
            period: {
              type: "string",
              description:
                'Accounting period: "annual", "Q1", "Q2", "Q3", "Q4". Defaults to "annual".',
            },
          },
          required: ["metric_names"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "calculate_financial_metric",
        description:
          "Calculate a financial metric using a preset formula. Use this AFTER you have retrieved the required data using query_financial_data.",
        parameters: {
          type: "object",
          properties: {
            metric_name: {
              type: "string",
              enum: presetFunctions.map((f) => f.name),
              description:
                "Name of the preset financial metric to calculate (e.g., 'debt_to_asset_ratio', 'current_ratio')",
            },
            inputs: {
              type: "object",
              description:
                "The input values for the calculation. Keys should match the required inputs for the metric.",
            },
          },
          required: ["metric_name", "inputs"],
        },
      },
    },
  ];
}
