/**
 * Financial Analysis Workflow Steps
 *
 * This file contains step functions for the financial analysis workflow.
 * Each step is a pure function: (state) => Promise<state>
 */

import OpenAI from "openai";
import { createServerSupabaseClient } from "../../supabase";
import {
  executeFunction,
  presetFunctions,
  getFunctionByName,
  type PresetFunction,
} from "../../preset-functions";
import { getFinancialAnalysisPrompt } from "../../prompts";
import { getAllMetricNames } from "../../financial-schema";
import type { FinancialAnalysisState } from "../../types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================================================
// Helper Functions
// ============================================================================

async function queryBusinessContext(): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data: chunks, error } = await supabase
    .from("document_chunks")
    .select(`
      content,
      documents!inner(id, name, doc_type)
    `)
    .eq("documents.doc_type", "business_info")
    .order("chunk_index", { ascending: true })
    .limit(10);

  if (error) {
    console.error("Error querying business context:", error);
    return "";
  }

  if (!chunks || chunks.length === 0) {
    return "";
  }

  const contextParts = chunks.map((chunk: any) => chunk.content);
  return contextParts.join("\n\n");
}

async function queryFinancialData(
  metricNames: string[],
  year?: string,
  period?: string,
  documentIds?: string[]
) {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from("financial_data")
    .select(`
      metric_name,
      metric_value,
      unit,
      year,
      period,
      document_id,
      documents!inner(id, name)
    `)
    .in("metric_name", metricNames);

  if (year) {
    query = query.eq("year", year);
  }

  if (period) {
    query = query.eq("period", period);
  }

  if (documentIds && documentIds.length > 0) {
    query = query.in("document_id", documentIds);
  }

  query = query.order("year", { ascending: false });
  query = query.order("period", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error querying financial data:", error);
    throw new Error("查询财务数据失败");
  }

  return (data || []) as any[];
}

function buildFunctionDefinitions(): OpenAI.Chat.ChatCompletionTool[] {
  const functions = presetFunctions;

  const tools: OpenAI.Chat.ChatCompletionTool[] = functions.map((func: PresetFunction) => {
    const requiredInputsStr = func.requiredInputs.join("、");
    const categoryMap: Record<string, string> = {
      liquidity: "流动性",
      solvency: "偿债能力",
      profitability: "盈利能力",
      efficiency: "营运效率",
      composite: "综合分析",
    };
    const categoryName = categoryMap[func.category] || func.category;

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
              description: "会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。",
            },
          },
          required: [],
        },
      },
    };
  });

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
            description: '财务指标的标准中文名称，例如"销售商品、提供劳务收到的现金"、"研发费用"。',
          },
          years: {
            type: "array",
            items: { type: "string" },
            description: '需要查询的年份列表，例如 ["2023", "2024"]。',
          },
          period: {
            type: "string",
            description: "会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。",
          },
        },
        required: ["metric_name", "years"],
      },
    },
  });

  return tools;
}

function formatCalculationSteps(
  func: PresetFunction,
  inputData: Record<string, number>,
  inputSources: Record<string, { unit: string; source: string }>,
  result: { value: number; formatted: string }
): string[] {
  const steps: string[] = [];

  Object.entries(inputData).forEach(([key, value], index) => {
    const source = inputSources[key];
    const formattedValue = value.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    steps.push(`步骤${index + 1}: 从${source.source}中提取${key} = ${formattedValue} ${source.unit}`);
  });

  const stepNum = Object.keys(inputData).length + 1;
  steps.push(`步骤${stepNum}: 计算 ${func.displayName} = ${result.formatted}`);

  return steps;
}

// ============================================================================
// Step Functions
// ============================================================================

/**
 * Step 1: Route question to appropriate function
 */
export async function routeToFunction(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const { question } = state.input;

  const availableFunctions = presetFunctions;
  const functionsList = availableFunctions
    .map((f: PresetFunction) => `- ${f.displayName} (${f.name}): ${f.interpretation || ""}`)
    .join("\n");

  const businessContext = await queryBusinessContext();
  if (businessContext) {
    console.log(`[Financial Analysis] Found business context: ${businessContext.length} chars`);
  }

  const metricList = getAllMetricNames().join("\n");
  const systemPrompt = getFinancialAnalysisPrompt({
    presetFunctionsList: functionsList,
    availableDocuments: "从数据库查询",
    context: "",
    metricList: metricList,
    businessContext: businessContext,
  });

  const functionDefinitions = buildFunctionDefinitions();

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    tools: functionDefinitions,
    tool_choice: "auto",
  });

  const responseMessage = completion.choices[0].message;

  if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
    return {
      ...state,
      routing: {
        selectedFunction: null,
        functionArgs: {},
        confidence: 0.3,
      },
      meta: {
        ...state.meta,
        currentStep: "route_to_function",
      },
    };
  }

  const toolCall = responseMessage.tool_calls[0];
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

  return {
    ...state,
    routing: {
      selectedFunction: functionName,
      functionArgs: functionArgs,
      confidence: 0.95,
    },
    meta: {
      ...state.meta,
      currentStep: "route_to_function",
    },
  };
}

/**
 * Step 2: Query financial data from database
 */
export async function queryData(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const { selectedFunction, functionArgs } = state.routing;
  const { year, period } = state.input;

  // Use selected documents if available, otherwise fallback to input IDs
  let targetDocumentIds = state.input.documentIds;
  if (state.documentSelection?.selectedDocuments?.length) {
    targetDocumentIds = state.documentSelection.selectedDocuments.map(d => d.documentId);
    console.log(`[Financial Analysis] Using ${targetDocumentIds.length} selected documents.`);
  }

  if (!selectedFunction) {
    throw new Error("No function selected in routing step");
  }

  // Handle dynamic metric retrieval (get_financial_metric)
  if (selectedFunction === "get_financial_metric") {
    let { metric_name, years, period: argPeriod } = functionArgs as any;
    const targetPeriod = argPeriod || period || "annual";

    // Fuzzy matching logic
    const allMetrics = getAllMetricNames();
    if (!allMetrics.includes(metric_name)) {
      const suffixMatch = allMetrics.find(
        (m) => m.endsWith(metric_name) || m.endsWith(`：${metric_name}`) || m.endsWith(`:${metric_name}`)
      );
      const partialMatch = allMetrics.find((m) => m.includes(metric_name));

      if (suffixMatch) {
        console.log(`[Financial Analysis] Fuzzy match: "${metric_name}" -> "${suffixMatch}"`);
        metric_name = suffixMatch;
      } else if (partialMatch) {
        console.log(`[Financial Analysis] Partial match: "${metric_name}" -> "${partialMatch}"`);
        metric_name = partialMatch;
      }
    }

    const financialData = await queryFinancialData([metric_name], undefined, targetPeriod, targetDocumentIds);

    const relevantData = financialData.filter((row: any) => years.includes(row.year));

    const sourceDocumentsMap = new Map();
    const dataMap: Record<string, any> = {};

    for (const row of relevantData) {
      const key = `${row.year}`;
      dataMap[key] = {
        value: Number(row.metric_value),
        unit: row.unit,
        source: row.documents.name,
        documentId: row.document_id,
      };

      if (!sourceDocumentsMap.has(row.document_id)) {
        sourceDocumentsMap.set(row.document_id, {
          id: row.document_id,
          name: row.documents.name,
          year: row.year,
          period: row.period,
        });
      }
    }

    const foundYears = Object.keys(dataMap);
    const missingYears = years.filter((y: string) => !foundYears.includes(y));

    return {
      ...state,
      dataQuery: {
        requiredMetrics: [metric_name],
        availableMetrics: foundYears.length > 0 ? [metric_name] : [],
        missingMetrics: missingYears.length > 0 ? missingYears.map((y: string) => `${y}年 ${metric_name}`) : [],
        dataMap: dataMap,
        sourceDocuments: Array.from(sourceDocumentsMap.values()),
      },
      meta: {
        ...state.meta,
        currentStep: "query_data",
      },
    };
  }

  // Handle preset function data query
  const presetFunc = getFunctionByName(selectedFunction);
  if (!presetFunc) {
    throw new Error(`Preset function not found: ${selectedFunction}`);
  }

  const targetYear = (functionArgs as any).year || year;
  const targetPeriod = (functionArgs as any).period || period || "annual";

  const requiredMetrics = presetFunc.requiredInputs;
  const financialData = await queryFinancialData(requiredMetrics, targetYear, targetPeriod, targetDocumentIds);

  const dataMap: Record<string, any> = {};
  const sourceDocumentsMap = new Map();

  for (const row of financialData) {
    const metricName = row.metric_name;
    if (!dataMap[metricName]) {
      dataMap[metricName] = {
        value: Number(row.metric_value),
        unit: row.unit,
        source: row.documents.name,
        documentId: row.document_id,
      };

      if (!sourceDocumentsMap.has(row.document_id)) {
        sourceDocumentsMap.set(row.document_id, {
          id: row.document_id,
          name: row.documents.name,
          year: row.year,
          period: row.period,
        });
      }
    }
  }

  const missingMetrics = requiredMetrics.filter((metric: string) => !dataMap[metric]);

  return {
    ...state,
    dataQuery: {
      requiredMetrics: requiredMetrics,
      availableMetrics: Object.keys(dataMap),
      missingMetrics: missingMetrics,
      dataMap: dataMap,
      sourceDocuments: Array.from(sourceDocumentsMap.values()),
    },
    meta: {
      ...state.meta,
      currentStep: "query_data",
    },
  };
}

/**
 * Step 3: Execute calculation
 */
export async function executeCalculation(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const { selectedFunction, functionArgs } = state.routing;
  const { dataMap } = state.dataQuery;

  if (!selectedFunction) {
    throw new Error("No function selected");
  }

  // Handle get_financial_metric (data retrieval and trend analysis)
  if (selectedFunction === "get_financial_metric") {
    const { years } = functionArgs as any;
    const sortedYears = (years as string[]).sort();

    const steps: string[] = [];
    const inputs: Record<string, { value: number; unit: string; source: string }> = {};

    sortedYears.forEach((y: string) => {
      const data = dataMap[y];
      if (!data) return;

      const formattedVal = data.value.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const metricName = (functionArgs as any).metric_name;
      steps.push(`从 ${data.source} 提取 ${y}年 ${metricName}: ${formattedVal} ${data.unit}`);
      inputs[`${y}年 ${metricName}`] = {
        value: data.value,
        unit: data.unit,
        source: data.source,
      };
    });

    let resultValue = 0;
    let resultFormatted = "";

    if (sortedYears.length >= 2) {
      const startYear = sortedYears[0];
      const endYear = sortedYears[sortedYears.length - 1];
      const startVal = dataMap[startYear].value;
      const endVal = dataMap[endYear].value;
      const change = endVal - startVal;
      const percentChange = startVal !== 0 ? (change / startVal) * 100 : 0;

      resultValue = change;
      resultFormatted = `${change > 0 ? "+" : ""}${change.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
      })} (${percentChange > 0 ? "+" : ""}${percentChange.toFixed(2)}%)`;

      steps.push(`计算变化: ${endYear}年 - ${startYear}年 = ${resultFormatted}`);
    } else {
      const y = sortedYears[0];
      resultValue = dataMap[y].value;
      resultFormatted = `${resultValue.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
      })} ${dataMap[y].unit}`;
    }

    return {
      ...state,
      calculation: {
        functionName: "get_financial_metric",
        functionDisplayName: "数据查询与分析",
        formula: "数据提取与对比",
        inputs: Object.fromEntries(
          Object.entries(inputs).map(([k, v]) => [k, v.value])
        ),
        result: {
          value: resultValue,
          formatted: resultFormatted,
          unit: dataMap[sortedYears[0]].unit,
        },
        steps: steps,
      },
      meta: {
        ...state.meta,
        currentStep: "execute_calculation",
      },
    };
  }

  // Handle preset function calculation
  const presetFunc = getFunctionByName(selectedFunction);
  if (!presetFunc) {
    throw new Error(`Preset function not found: ${selectedFunction}`);
  }

  const inputValues: Record<string, number> = {};
  presetFunc.requiredInputs.forEach((metric: string) => {
    inputValues[metric] = dataMap[metric].value;
  });

  const calcResult = executeFunction(selectedFunction, inputValues);

  const inputSources: Record<string, { unit: string; source: string }> = {};
  presetFunc.requiredInputs.forEach((metric: string) => {
    inputSources[metric] = {
      unit: dataMap[metric].unit,
      source: dataMap[metric].source,
    };
  });

  const steps = formatCalculationSteps(presetFunc, inputValues, inputSources, calcResult.result);

  return {
    ...state,
    calculation: {
      functionName: selectedFunction,
      functionDisplayName: presetFunc.displayName,
      formula: presetFunc.formulaDisplay || presetFunc.formula,
      inputs: inputValues,
      result: {
        value: calcResult.result.value,
        formatted: calcResult.result.formatted,
        unit: presetFunc.unit,
      },
      steps: steps,
      warnings: calcResult.result.warnings,
    },
    meta: {
      ...state.meta,
      currentStep: "execute_calculation",
    },
  };
}

/**
 * Step 4: Evaluate confidence
 */
export async function evaluateConfidence(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const { requiredMetrics, availableMetrics } = state.dataQuery;
  const { warnings } = state.calculation;

  const factors = [
    {
      name: "required_inputs",
      score: requiredMetrics.length > 0 ? availableMetrics.length / requiredMetrics.length : 0,
      weight: 0.3,
    },
    {
      name: "data_quality",
      score: 0.95,
      weight: 0.3,
    },
    {
      name: "function_match",
      score: state.routing.confidence,
      weight: 0.2,
    },
    {
      name: "validation",
      score: !warnings || warnings.length === 0 ? 1.0 : 0.7,
      weight: 0.2,
    },
  ];

  const overall = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const threshold = 0.7;
  const passed = overall >= threshold;

  return {
    ...state,
    confidence: {
      score: overall,
      factors: factors,
      threshold: threshold,
      passed: passed,
      reason: !passed ? `置信度 ${overall.toFixed(2)} 低于阈值 ${threshold}` : undefined,
    },
    meta: {
      ...state.meta,
      currentStep: "evaluate_confidence",
    },
  };
}

/**
 * Step 5: Generate natural language response
 */
export async function generateResponse(
  state: FinancialAnalysisState
): Promise<FinancialAnalysisState> {
  const { question } = state.input;
  const { selectedFunction } = state.routing;
  const { missingMetrics, sourceDocuments, dataMap } = state.dataQuery;
  const { functionDisplayName, result, warnings } = state.calculation;
  const { score: confidenceScore, passed: confidencePassed } = state.confidence;

  // Check for no function selected
  if (!selectedFunction) {
    return {
      ...state,
      output: {
        type: "no_function",
        answer:
          "抱歉，我无法识别您想要计算的财务指标。请尝试更具体的问题，例如「计算2024年的资产负债率」。",
        confidence: 0.3,
        sourceDocuments: [],
        suggestion: "您可以询问流动比率、资产负债率、净利润率等常见财务指标。",
      },
      meta: {
        ...state.meta,
        currentStep: "generate_response",
        endTime: Date.now(),
      },
    };
  }

  // Check for missing data
  if (missingMetrics.length > 0) {
    const presetFunc = getFunctionByName(selectedFunction);
    const missingList = missingMetrics.join("、");

    return {
      ...state,
      output: {
        type: "insufficient_data",
        answer: `抱歉，我无法计算${presetFunc?.displayName || "该指标"}，因为缺少必要的数据。`,
        confidence: 0,
        sourceDocuments: sourceDocuments,
        missingData: missingMetrics,
        suggestion: `请确保数据库中包含相关年份和期间的以下指标：${missingList}。您可以通过管理员模式上传财务报表。`,
      },
      meta: {
        ...state.meta,
        currentStep: "generate_response",
        endTime: Date.now(),
      },
    };
  }

  // Check for low confidence
  if (!confidencePassed) {
    return {
      ...state,
      output: {
        type: "low_confidence",
        answer: `计算结果的置信度较低（${confidenceScore.toFixed(2)}），建议谨慎使用。${state.confidence.reason || ""
          }`,
        confidence: confidenceScore,
        sourceDocuments: sourceDocuments,
      },
      meta: {
        ...state.meta,
        currentStep: "generate_response",
        endTime: Date.now(),
      },
    };
  }

  // Generate natural language explanation
  const presetFunc = selectedFunction !== "get_financial_metric" ? getFunctionByName(selectedFunction) : null;

  const explanationPrompt =
    selectedFunction === "get_financial_metric"
      ? `
根据以下数据，回答用户问题：
问题: ${question}
数据: ${JSON.stringify(dataMap)}
计算结果: ${result.formatted}

请用简洁的语言回答。
`
      : `
根据以下计算结果，生成一个简洁的自然语言解释（1-2句话）：

指标: ${functionDisplayName}
计算结果: ${result.formatted}
数据来源: ${sourceDocuments.map((d) => d.name).join("、")}
解释指导: ${presetFunc?.interpretation || ""}
${warnings && warnings.length > 0 ? `\n警告: ${warnings.join("；")}` : ""}

请用专业但易懂的语言解释这个结果的含义。
`;

  const explanationCompletion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: explanationPrompt }],
    max_completion_tokens: 1000,
  });

  const explanation = explanationCompletion.choices[0].message.content || "";

  // Build calculation detail for output
  const inputs: Record<string, { value: number; unit: string; source: string }> = {};

  if (selectedFunction === "get_financial_metric") {
    Object.entries(dataMap).forEach(([year, data]: [string, any]) => {
      const metricName = (state.routing.functionArgs as any).metric_name;
      inputs[`${year}年 ${metricName}`] = {
        value: data.value,
        unit: data.unit,
        source: data.source,
      };
    });
  } else {
    const presetFunc = getFunctionByName(selectedFunction);
    if (presetFunc) {
      presetFunc.requiredInputs.forEach((metric: string) => {
        inputs[metric] = {
          value: dataMap[metric].value,
          unit: dataMap[metric].unit,
          source: dataMap[metric].source,
        };
      });
    }
  }

  return {
    ...state,
    output: {
      type: "calculation_result",
      answer: explanation,
      calculation: {
        functionUsed: selectedFunction,
        functionDisplayName: functionDisplayName,
        formula: state.calculation.formula,
        inputs: inputs,
        result: {
          value: result.value,
          formatted: result.formatted,
          unit: result.unit,
        },
        steps: state.calculation.steps,
      },
      confidence: confidenceScore,
      sourceDocuments: sourceDocuments,
      warnings: warnings,
    },
    meta: {
      ...state.meta,
      currentStep: "generate_response",
      endTime: Date.now(),
    },
  };
}
