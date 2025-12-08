/**
 * Financial Analysis API Route
 *
 * Calculates financial metrics using structured data and preset functions.
 * Uses OpenAI function calling to identify which preset function to use,
 * then queries the structured database and executes deterministic calculations.
 *
 * @route POST /api/financial-analysis
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerSupabaseClient } from "../../../lib/supabase";
import {
  executeFunction,
  presetFunctions,
  getFunctionByName,
  type PresetFunction
} from "../../../lib/preset-functions";
import { buildCalculationConfidence } from "../../../lib/confidence-scoring";
import { getFinancialAnalysisPrompt } from "../../../lib/prompts";
import { getAllMetricNames } from "../../../lib/financial-schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Type definitions
interface FinancialAnalysisRequest {
  question: string;
  year?: string;
  period?: string;
  documentIds?: string[];
}

interface CalculationResult {
  functionUsed: string;
  functionDisplayName: string;
  formula: string;
  inputs: {
    [paramName: string]: {
      value: number;
      unit: string;
      source: string;
    };
  };
  result: {
    value: number;
    formatted: string;
    unit: string;
  };
  steps: string[];
}

interface SourceDocument {
  id: string;
  name: string;
  year: string;
  period: string;
}

interface FinancialAnalysisResponse {
  type: 'calculation_result' | 'insufficient_data' | 'low_confidence' | 'no_function';
  answer?: string;
  calculation?: CalculationResult;
  confidence: number;
  sourceDocuments: SourceDocument[];
  missingData?: string[];
  suggestion?: string;
}

/**
 * Query financial data from Supabase
 */
async function queryFinancialData(
  metricNames: string[],
  year?: string,
  period?: string,
  documentIds?: string[]
) {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('financial_data')
    .select(`
      metric_name,
      metric_value,
      unit,
      year,
      period,
      document_id,
      documents!inner(id, name)
    `)
    .in('metric_name', metricNames);

  if (year) {
    query = query.eq('year', year);
  }

  if (period) {
    query = query.eq('period', period);
  }

  if (documentIds && documentIds.length > 0) {
    query = query.in('document_id', documentIds);
  }

  // Order by most recent first
  query = query.order('year', { ascending: false });
  query = query.order('period', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error querying financial data:', error);
    throw new Error('查询财务数据失败');
  }

  return (data || []) as any[];
}

/**
 * Build function definitions for OpenAI function calling
 */
function buildFunctionDefinitions(): OpenAI.Chat.ChatCompletionTool[] {
  const functions = presetFunctions;

  const tools: OpenAI.Chat.ChatCompletionTool[] = functions.map((func: PresetFunction) => {
    // Build comprehensive description with trigger keywords and required data
    const requiredInputsStr = func.requiredInputs.join('、');
    const categoryMap: Record<string, string> = {
      'liquidity': '流动性',
      'solvency': '偿债能力',
      'profitability': '盈利能力',
      'efficiency': '营运效率',
      'composite': '综合分析'
    };
    const categoryName = categoryMap[func.category] || func.category;

    const description = [
      `当用户询问${func.displayName}（${func.displayNameEn}）时调用此函数。`,
      `这是一个${categoryName}指标。`,
      `需要的数据：${requiredInputsStr}。`,
      func.interpretation ? `说明：${func.interpretation}` : '',
      `如果用户的问题包含"${func.displayName}"或相关术语，应该调用此函数。`
    ].filter(Boolean).join(' ');

    return {
      type: 'function' as const,
      function: {
        name: func.name,
        description,
        parameters: {
          type: 'object',
          properties: {
            year: {
              type: 'string',
              description: '财务年份，例如 "2024" 或 "2025"。如果用户未指定，可以省略此参数以使用最新数据。',
            },
            period: {
              type: 'string',
              description: '会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。',
            },
          },
          required: [],
        },
      },
    };
  });

  // Add dynamic data retrieval tool
  tools.push({
    type: 'function',
    function: {
      name: 'get_financial_metric',
      description: '获取特定财务指标在指定年份的数据。当用户询问的指标不在预设函数列表中（如"销售商品收到的现金"、"研发费用"等），或者需要计算增长率、同比变化时，使用此函数。',
      parameters: {
        type: 'object',
        properties: {
          metric_name: {
            type: 'string',
            description: '财务指标的标准中文名称，例如"销售商品、提供劳务收到的现金"、"研发费用"。',
          },
          years: {
            type: 'array',
            items: { type: 'string' },
            description: '需要查询的年份列表，例如 ["2023", "2024"]。',
          },
          period: {
            type: 'string',
            description: '会计期间：annual（年度）、Q1、Q2、Q3、Q4。默认为 annual。',
          },
        },
        required: ['metric_name', 'years'],
      },
    },
  });

  return tools;
}

/**
 * Format calculation steps for display
 */
function formatCalculationSteps(
  func: PresetFunction,
  inputData: Record<string, number>,
  inputSources: Record<string, { unit: string; source: string }>,
  result: { value: number; formatted: string }
): string[] {
  const steps: string[] = [];

  // Step 1-N: Extract each input
  Object.entries(inputData).forEach(([key, value], index) => {
    const source = inputSources[key];
    const formattedValue = value.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    steps.push(
      `步骤${index + 1}: 从${source.source}中提取${key} = ${formattedValue} ${source.unit}`
    );
  });

  // Final step: Show calculation
  const stepNum = Object.keys(inputData).length + 1;
  steps.push(
    `步骤${stepNum}: 计算 ${func.displayName} = ${result.formatted}`
  );

  return steps;
}

/**
 * Main POST handler
 */
export async function POST(request: NextRequest) {
  try {
    const body: FinancialAnalysisRequest = await request.json();
    const { question, year, period, documentIds } = body;

    // Validate request
    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '问题不能为空' },
        { status: 400 }
      );
    }

    // Get available preset functions
    const availableFunctions = presetFunctions;
    const functionsList = availableFunctions
      .map((f: PresetFunction) => `- ${f.displayName} (${f.name}): ${f.interpretation || ''}`)
      .join('\n');

    // Build system prompt
    const metricList = getAllMetricNames().join('\n');
    const systemPrompt = getFinancialAnalysisPrompt({
      presetFunctionsList: functionsList,
      availableDocuments: '从数据库查询',
      context: '',
      metricList: metricList,
    });

    // Step 1: Use OpenAI function calling to identify which function to use
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

    // Check if function was called
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      // No function called - LLM thinks no calculation is needed
      return NextResponse.json({
        type: 'no_function',
        answer: responseMessage.content || '抱歉，我无法识别您想要计算的财务指标。请尝试更具体的问题，例如"计算2024年的资产负债率"。',
        confidence: 0.3,
        sourceDocuments: [],
        suggestion: '您可以询问流动比率、资产负债率、净利润率等常见财务指标。',
      } as FinancialAnalysisResponse);
    }

    // Extract function call
    const toolCall = responseMessage.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

    // Handle dynamic metric retrieval
    if (functionName === 'get_financial_metric') {
      let { metric_name, years, period: argPeriod } = functionArgs;
      const targetPeriod = argPeriod || period || 'annual';

      // --- Fuzzy Match Logic Start ---
      const allMetrics = getAllMetricNames();
      // If exact match not found, try to find a better match
      if (!allMetrics.includes(metric_name)) {
        // 1. Try finding a metric that ends with the requested name (e.g. "加：其他收益" ends with "其他收益")
        const suffixMatch = allMetrics.find(m => m.endsWith(metric_name) || m.endsWith(`：${metric_name}`) || m.endsWith(`:${metric_name}`));

        // 2. Try finding a metric that contains the requested name
        const partialMatch = allMetrics.find(m => m.includes(metric_name));

        if (suffixMatch) {
          console.log(`[Financial Analysis] Fuzzy match: "${metric_name}" -> "${suffixMatch}"`);
          metric_name = suffixMatch;
        } else if (partialMatch) {
          console.log(`[Financial Analysis] Partial match: "${metric_name}" -> "${partialMatch}"`);
          metric_name = partialMatch;
        }
      }
      // --- Fuzzy Match Logic End ---

      // Query data for all requested years
      const financialData = await queryFinancialData(
        [metric_name],
        undefined, // Query all years first, then filter
        targetPeriod,
        documentIds
      );

      // Filter by requested years
      const relevantData = financialData.filter((row: any) => years.includes(row.year));

      const sourceDocumentsMap = new Map<string, SourceDocument>();
      const dataMap: Record<string, { value: number; unit: string; source: string; year: string }> = {};

      for (const row of relevantData) {
        const key = `${row.year}`;
        dataMap[key] = {
          value: Number(row.metric_value),
          unit: row.unit,
          source: row.documents.name,
          year: row.year
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

      // Check if we found data for all requested years
      const foundYears = Object.keys(dataMap);
      const missingYears = years.filter((y: string) => !foundYears.includes(y));

      if (missingYears.length > 0) {
        return NextResponse.json({
          type: 'insufficient_data',
          answer: `抱歉，我无法找到 ${missingYears.join('、')} 年的"${metric_name}"数据。`,
          confidence: 0,
          sourceDocuments: Array.from(sourceDocumentsMap.values()),
          missingData: missingYears.map((y: string) => `${y}年 ${metric_name}`),
          suggestion: `请确保数据库中包含${missingYears.join('、')}年的财务报表。`,
        } as FinancialAnalysisResponse);
      }

      // Construct a "Calculation" result for display
      // If multiple years, calculate growth/change
      let resultValue = 0;
      let resultFormatted = '';
      const steps: string[] = [];
      const inputs: Record<string, { value: number; unit: string; source: string }> = {};

      // Sort years to show trend
      const sortedYears = years.sort();

      sortedYears.forEach((y: string) => {
        const data = dataMap[y];
        const formattedVal = data.value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        steps.push(`从 ${data.source} 提取 ${y}年 ${metric_name}: ${formattedVal} ${data.unit}`);
        inputs[`${y}年 ${metric_name}`] = {
          value: data.value,
          unit: data.unit,
          source: data.source
        };
      });

      if (sortedYears.length >= 2) {
        const startYear = sortedYears[0];
        const endYear = sortedYears[sortedYears.length - 1];
        const startVal = dataMap[startYear].value;
        const endVal = dataMap[endYear].value;
        const change = endVal - startVal;
        const percentChange = startVal !== 0 ? (change / startVal) * 100 : 0;

        resultValue = change;
        resultFormatted = `${change > 0 ? '+' : ''}${change.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%)`;

        steps.push(`计算变化: ${endYear}年 - ${startYear}年 = ${resultFormatted}`);
      } else {
        const y = sortedYears[0];
        resultValue = dataMap[y].value;
        resultFormatted = `${resultValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} ${dataMap[y].unit}`;
      }

      const calculation: CalculationResult = {
        functionUsed: 'get_financial_metric',
        functionDisplayName: '数据查询与分析',
        formula: '数据提取与对比',
        inputs,
        result: {
          value: resultValue,
          formatted: resultFormatted,
          unit: dataMap[sortedYears[0]].unit,
        },
        steps,
      };

      // Generate explanation
      const explanationPrompt = `
      根据以下数据，回答用户问题：
      问题: ${question}
      数据: ${JSON.stringify(dataMap)}
      计算结果: ${resultFormatted}
      
      请用简洁的语言回答。
      `;

      const explanationCompletion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: explanationPrompt }],

        max_completion_tokens: 1000,
      });

      return NextResponse.json({
        type: 'calculation_result',
        answer: explanationCompletion.choices[0].message.content || '',
        calculation,
        confidence: 0.9,
        sourceDocuments: Array.from(sourceDocumentsMap.values()),
      } as FinancialAnalysisResponse);
    }

    // Get function definition
    const presetFunc = getFunctionByName(functionName);
    if (!presetFunc) {
      return NextResponse.json({
        type: 'no_function',
        answer: `抱歉，未找到名为 ${functionName} 的计算函数。`,
        confidence: 0,
        sourceDocuments: [],
      } as FinancialAnalysisResponse);
    }

    // Determine year and period (from args or request)
    const targetYear = functionArgs.year || year;
    const targetPeriod = functionArgs.period || period || 'annual';

    // Step 2: Query database for required inputs
    const requiredMetrics = presetFunc.requiredInputs;
    const financialData = await queryFinancialData(
      requiredMetrics,
      targetYear,
      targetPeriod,
      documentIds
    );

    // Step 3: Check if we have all required data
    const dataMap: Record<string, { value: number; unit: string; source: string; documentId: string }> = {};
    const sourceDocumentsMap = new Map<string, SourceDocument>();

    for (const row of financialData) {
      const metricName = row.metric_name;
      if (!dataMap[metricName]) {
        dataMap[metricName] = {
          value: Number(row.metric_value),
          unit: row.unit,
          source: row.documents.name,
          documentId: row.document_id,
        };

        // Track source document
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

    // Check for missing data
    const missingMetrics = requiredMetrics.filter((metric: string) => !dataMap[metric]);

    if (missingMetrics.length > 0) {
      // Insufficient data
      const missingList = missingMetrics.join('、');
      return NextResponse.json({
        type: 'insufficient_data',
        answer: `抱歉，我无法计算${presetFunc.displayName}，因为缺少必要的数据。`,
        confidence: 0,
        sourceDocuments: Array.from(sourceDocumentsMap.values()),
        missingData: missingMetrics,
        suggestion: `请确保数据库中包含${targetYear || '相关年份'}${targetPeriod === 'annual' ? '年度' : targetPeriod}的以下指标：${missingList}。您可以通过管理员模式上传财务报表。`,
      } as FinancialAnalysisResponse);
    }

    // Step 4: Execute calculation using preset function
    const inputValues: Record<string, number> = {};
    requiredMetrics.forEach((metric: string) => {
      inputValues[metric] = dataMap[metric].value;
    });

    const calcResult = executeFunction(functionName, inputValues);

    // Step 5: Build calculation confidence score
    const confidenceScore = buildCalculationConfidence({
      requiredInputs: requiredMetrics.length,
      availableInputs: requiredMetrics.length, // All data found
      dataQualityScore: 0.95, // High quality from structured DB
      functionMatchScore: 0.95, // Function called by LLM
      validationPassed: !calcResult.result.warnings || calcResult.result.warnings.length === 0,
      warningCount: calcResult.result.warnings?.length || 0,
    });

    // Check confidence threshold
    if (!confidenceScore.pass) {
      return NextResponse.json({
        type: 'low_confidence',
        answer: `计算结果的置信度较低（${confidenceScore.overall.toFixed(2)}），建议谨慎使用。${confidenceScore.reason || ''}`,
        confidence: confidenceScore.overall,
        sourceDocuments: Array.from(sourceDocumentsMap.values()),
      } as FinancialAnalysisResponse);
    }

    // Step 6: Format calculation steps
    const inputSources: Record<string, { unit: string; source: string }> = {};
    requiredMetrics.forEach((metric: string) => {
      inputSources[metric] = {
        unit: dataMap[metric].unit,
        source: dataMap[metric].source,
      };
    });

    const steps = formatCalculationSteps(
      presetFunc,
      inputValues,
      inputSources,
      calcResult.result
    );

    // Build calculation details
    const inputs: Record<string, { value: number; unit: string; source: string }> = {};
    requiredMetrics.forEach((metric: string) => {
      inputs[metric] = {
        value: dataMap[metric].value,
        unit: dataMap[metric].unit,
        source: dataMap[metric].source,
      };
    });

    const calculation: CalculationResult = {
      functionUsed: functionName,
      functionDisplayName: presetFunc.displayName,
      formula: presetFunc.formulaDisplay || presetFunc.formula,
      inputs,
      result: {
        value: calcResult.result.value,
        formatted: calcResult.result.formatted,
        unit: presetFunc.unit,
      },
      steps,
    };

    // Step 7: Generate natural language explanation
    const explanationPrompt = `
根据以下计算结果，生成一个简洁的自然语言解释（1-2句话）：

指标: ${presetFunc.displayName}
计算结果: ${calcResult.result.formatted}
数据来源: ${Array.from(sourceDocumentsMap.values()).map(d => d.name).join('、')}
解释指导: ${presetFunc.interpretation || ''}
${calcResult.result.warnings && calcResult.result.warnings.length > 0 ? `\n警告: ${calcResult.result.warnings.join('；')}` : ''}

请用专业但易懂的语言解释这个结果的含义。
`;

    const explanationCompletion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: explanationPrompt }],

      max_completion_tokens: 1000,
    });

    const explanation = explanationCompletion.choices[0].message.content || '';

    // Return successful calculation
    return NextResponse.json({
      type: 'calculation_result',
      answer: explanation,
      calculation,
      confidence: confidenceScore.overall,
      sourceDocuments: Array.from(sourceDocumentsMap.values()),
    } as FinancialAnalysisResponse);

  } catch (error: any) {
    console.error('Financial Analysis v2 API error:', error);
    return NextResponse.json(
      {
        error: '处理财务分析请求时发生错误',
        details: error.message
      },
      { status: 500 }
    );
  }
}
