/**
 * Financial Tools Registration
 *
 * Registers all financial calculation tools from preset-functions.ts
 * into the unified ToolRegistry.
 *
 * Tools registered:
 * - 22 preset financial calculation functions (liquidity, solvency, profitability, efficiency, composite)
 * - get_financial_metric: Dynamic metric retrieval
 * - query_financial_data: Multi-metric query
 * - calculate_financial_metric: Execute preset calculation
 */

import { z } from "zod";
import {
  presetFunctions,
  executeFunction,
  type PresetFunction,
  type FunctionCategory,
} from "../preset-functions";
import type {
  Tool,
  ToolExecutionResult,
  FinancialToolMetadata,
} from "./types";
import {
  FinancialToolInputSchema,
  FinancialToolOutputSchema,
  QueryFinancialDataInputSchema,
  QueryFinancialDataOutputSchema,
} from "./types";
import { toolRegistry } from "./registry";

// ============================================================================
// Category Mapping
// ============================================================================

const CATEGORY_MAP: Record<FunctionCategory, string> = {
  liquidity: "流动性",
  solvency: "偿债能力",
  profitability: "盈利能力",
  efficiency: "营运效率",
  composite: "综合分析",
};

// ============================================================================
// Tool Factories
// ============================================================================

/**
 * Create a Tool from a PresetFunction
 */
function createFinancialToolFromPreset(preset: PresetFunction): Tool {
  const categoryName = CATEGORY_MAP[preset.category] || preset.category;
  const requiredInputsStr = preset.requiredInputs.join("、");

  const description = [
    `当用户询问${preset.displayName}（${preset.displayNameEn}）时调用此函数。`,
    `这是一个${categoryName}指标。`,
    `需要的数据：${requiredInputsStr}。`,
    preset.interpretation ? `说明：${preset.interpretation}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const metadata: FinancialToolMetadata = {
    requiredInputs: preset.requiredInputs,
    formulaDisplay: preset.formulaDisplay,
    unit: preset.unit,
    financialCategory: preset.category,
  };

  return {
    name: preset.name,
    displayName: preset.displayName,
    displayNameEn: preset.displayNameEn,
    description,
    category: "financial",
    inputSchema: FinancialToolInputSchema,
    outputSchema: FinancialToolOutputSchema,
    metadata: { financial: metadata },

    execute: async (input): Promise<ToolExecutionResult> => {
      // This is a placeholder - actual execution requires data fetching
      // In real usage, the workflow orchestrator handles data retrieval
      // and then calls executeFunction with the actual metric values
      return {
        success: false,
        error:
          "Direct execution not supported. Use workflow orchestrator to fetch data first.",
      };
    },
  };
}

// ============================================================================
// Utility Tools
// ============================================================================

/**
 * Get Financial Metric Tool
 *
 * For querying specific financial metrics not covered by preset functions,
 * or for retrieving raw data for comparisons/growth calculations.
 */
const getFinancialMetricTool: Tool = {
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
    // Placeholder - actual implementation in workflow
    return {
      success: false,
      error: "Execute via workflow orchestrator",
    };
  },
};

/**
 * Query Financial Data Tool
 *
 * For querying multiple financial metrics at once.
 * Used by guidance-chat for tool-augmented responses.
 */
const queryFinancialDataTool: Tool = {
  name: "query_financial_data",
  displayName: "查询财务数据",
  displayNameEn: "Query Financial Data",
  description:
    "Query structured financial data from the database. Use this to get specific financial metrics like 资产总计, 负债总计, 流动资产合计, 净利润 etc. Always use this tool first to get actual financial data before performing calculations.",
  category: "query",
  inputSchema: QueryFinancialDataInputSchema,
  outputSchema: QueryFinancialDataOutputSchema,

  execute: async (input): Promise<ToolExecutionResult> => {
    // Placeholder - actual implementation in workflow
    return {
      success: false,
      error: "Execute via workflow orchestrator",
    };
  },
};

/**
 * Calculate Financial Metric Tool
 *
 * Execute a preset financial calculation with provided data.
 * Used by guidance-chat after querying data.
 */
const calculateFinancialMetricTool: Tool = {
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
// OpenAI Function Definition Helpers
// ============================================================================

/**
 * Build OpenAI-compatible function definitions for financial analysis workflow
 *
 * This generates the same format as the original buildFunctionDefinitions()
 * in financial-analysis/steps.ts for backward compatibility.
 */
export function buildFinancialAnalysisFunctionDefs(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}> {
  const tools = presetFunctions.map((func) => {
    const requiredInputsStr = func.requiredInputs.join("、");
    const categoryName = CATEGORY_MAP[func.category] || func.category;

    const description = [
      `当用户询问${func.displayName}（${func.displayNameEn}）时调用此函数。`,
      `这是一个${categoryName}指标。`,
      `需要的数据：${requiredInputsStr}。`,
      func.interpretation ? `说明：${func.interpretation}` : "",
      `如果用户的问题包含"${func.displayName}"或相关术语，应该调用此函数。`,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      type: "function" as const,
      function: {
        name: func.name,
        description,
        parameters: {
          type: "object",
          properties: {
            year: {
              type: "string",
              description:
                '财务年份，例如 "2024" 或 "2025"。如果用户未指定，可以省略此参数以使用最新数据。',
            },
            period: {
              type: "string",
              description:
                "会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。",
            },
          },
          required: [],
        },
      },
    };
  });

  // Add get_financial_metric tool
  tools.push({
    type: "function",
    function: {
      name: "get_financial_metric",
      description:
        '获取特定财务指标在指定年份的数据。当用户询问的指标不在预设函数列表中（如"销售商品收到的现金"、"研发费用"等），或者需要计算增长率、同比变化时，使用此函数。',
      parameters: {
        type: "object",
        properties: {
          metric_name: {
            type: "string",
            description:
              '财务指标的标准中文名称，例如"销售商品、提供劳务收到的现金"、"研发费用"。',
          },
          years: {
            type: "array",
            items: { type: "string" },
            description: '需要查询的年份列表，例如 ["2023", "2024"]。',
          },
          period: {
            type: "string",
            description:
              "会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。",
          },
        },
        required: ["metric_name", "years"],
      },
    },
  });

  return tools;
}

/**
 * Build OpenAI-compatible function definitions for guidance chat workflow
 *
 * Returns query_financial_data and calculate_financial_metric tools.
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

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Register all financial tools in the global registry
 *
 * Call this at application startup to make all tools available.
 */
export function registerFinancialTools(): void {
  // Register preset function tools
  presetFunctions.forEach((preset) => {
    const tool = createFinancialToolFromPreset(preset);
    if (!toolRegistry.has(tool.name)) {
      toolRegistry.register(tool);
    }
  });

  // Register utility tools
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

/**
 * Get all financial tool names (for display/selection)
 */
export function getFinancialToolNames(): string[] {
  return presetFunctions.map((f) => f.name);
}

/**
 * Get financial tool by name
 */
export function getFinancialTool(name: string): PresetFunction | undefined {
  return presetFunctions.find((f) => f.name === name);
}

// ============================================================================
// Auto-registration (optional)
// ============================================================================

// Uncomment to auto-register on module load:
// registerFinancialTools();
