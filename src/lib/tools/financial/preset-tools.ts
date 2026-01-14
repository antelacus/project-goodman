/**
 * Financial Preset Tools
 *
 * Auto-generates 22 financial calculation tools from preset-functions.ts.
 * Each preset function becomes a registered tool in the ToolRegistry.
 */

import {
  presetFunctions,
  executeFunction,
  type PresetFunction,
  type FunctionCategory,
} from "@/lib/financial";
import type {
  Tool,
  ToolExecutionResult,
  FinancialToolMetadata,
} from "../types";
import {
  FinancialToolInputSchema,
  FinancialToolOutputSchema,
} from "../types";
import { toolRegistry } from "../registry";
import { queryFinancialData } from "../../services/financial-data";

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
// v4.0: Source Reference Helpers
// ============================================================================

/**
 * Infer document type based on required inputs
 * Balance sheet items → 资产负债表
 * Income statement items → 利润表
 * Cash flow items → 现金流量表
 */
function inferDocumentType(requiredInputs: string[]): string {
  const hasBalanceSheet = requiredInputs.some(
    (input) =>
      input.includes("资产") ||
      input.includes("负债") ||
      input.includes("权益") ||
      input.includes("存货") ||
      input.includes("应收")
  );
  const hasIncomeStatement = requiredInputs.some(
    (input) =>
      input.includes("收入") ||
      input.includes("利润") ||
      input.includes("费用") ||
      input.includes("成本")
  );
  const hasCashFlow = requiredInputs.some(
    (input) => input.includes("现金") || input.includes("现金流")
  );

  // If multiple types, return most specific one
  if (hasCashFlow) return "现金流量表";
  if (hasIncomeStatement && hasBalanceSheet) return "财务报表";
  if (hasIncomeStatement) return "利润表";
  if (hasBalanceSheet) return "资产负债表";

  return "财务报表";
}

// ============================================================================
// Tool Factory
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
      const { year, period } = input as { year?: string; period?: string };

      try {
        // Query required data
        const data = await queryFinancialData(preset.requiredInputs, year, period);

        // Prepare inputs for calculation
        const inputs: Record<string, number> = {};
        const missingMetrics: string[] = [];

        preset.requiredInputs.forEach(metric => {
          const point = data.find(d => d.metric_name === metric);
          if (point) {
            inputs[metric] = point.metric_value;
          } else {
            missingMetrics.push(metric);
          }
        });

        if (missingMetrics.length > 0) {
          return {
            success: false,
            error: `Missing required data: ${missingMetrics.join(", ")}`,
            data: { missingMetrics }
          };
        }

        // Execute calculation
        const result = executeFunction(preset.name, inputs);

        // v4.0: Build source reference from database metadata (not LLM-generated)
        const primaryData = data[0];
        const source = primaryData ? {
          documentId: primaryData.document_id,
          documentName: primaryData.documents.name,
          documentType: inferDocumentType(preset.requiredInputs),
          year: primaryData.year,
          period: primaryData.period,
        } : undefined;

        return {
          success: true,
          data: {
            value: result.result.value,
            formatted: result.result.formatted,
            unit: preset.unit,
            displayName: result.displayName,
            formula: result.formulaDisplay,
            interpretation: result.interpretation,
            warnings: result.result.warnings,
            sourceDocuments: data.map(d => d.documents.name),
            // v4.0: Structured source reference for transparency
            source,
            // v4.0.1: Include input values for formula display in process log
            inputs,
          }
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Calculation failed"
        };
      }
    },
  };
}

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all preset financial tools in the registry
 */
export function registerPresetTools(): void {
  presetFunctions.forEach((preset) => {
    const tool = createFinancialToolFromPreset(preset);
    if (!toolRegistry.has(tool.name)) {
      toolRegistry.register(tool);
    }
  });
}

// ============================================================================
// OpenAI Function Definition Builder
// ============================================================================

/**
 * Build OpenAI-compatible function definitions for financial analysis workflow
 */
export function buildFinancialAnalysisFunctionDefs(): Array<{
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}> {
  const tools: Array<{
    type: "function";
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }> = presetFunctions.map((func) => {
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

  // Add get_financial_metric tool definition
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

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Get all preset function names
 */
export function getPresetToolNames(): string[] {
  return presetFunctions.map((f) => f.name);
}

/**
 * Get preset function by name
 */
export function getPresetTool(name: string): PresetFunction | undefined {
  return presetFunctions.find((f) => f.name === name);
}
