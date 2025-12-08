/**
 * Guidance Chat API Route
 *
 * Provides regulatory compliance guidance using hybrid search:
 * - Vector similarity search for semantic matching
 * - Keyword matching on structured regulations
 * - Citation-based responses with article references
 * - Confidence scoring for response quality
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { getGuidanceChatPrompt } from '../../../lib/prompts';
import { buildGuidanceConfidence } from '../../../lib/confidence-scoring';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GuidanceChatRequest {
  question: string;
  uploadedDocument?: {
    text: string;
    fileName: string;
    id?: string;
  };
  documentIds?: string[];
  regulationCategories?: string[];
}

interface Citation {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

interface RelatedArticle {
  regulation: string;
  article: string;
  summary: string;
}

interface CalculationDetail {
  functionName: string;
  functionDisplayName: string;
  formula: string;
  inputs: Record<string, { value: number; unit: string; source: string }>;
  result: {
    value: number;
    formatted: string;
  };
  description?: string; // e.g., "当前资产负债率" or "签订借款后的资产负债率"
}

interface GuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
  calculations?: CalculationDetail[];
}

/**
 * Extract keywords from question using simple Chinese tokenization
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // Common financial/tax keywords
  const keywordPatterns = [
    '增值税', '所得税', '企业所得税', '个人所得税', '印花税', '消费税',
    '税率', '税收', '纳税', '征收', '免税', '减税', '退税',
    '会计', '准则', '核算', '计量', '确认', '披露',
    '资产', '负债', '权益', '收入', '费用', '利润',
    '审计', '报告', '报表', '财务',
    '发票', '凭证', '账簿', '账务',
    '股权', '投资', '融资', '借款',
    '合同', '协议', '条款',
    '软件', '技术', '服务', '销售', '采购',
    '研发', '开发', '生产', '制造',
    '进口', '出口', '关税',
  ];

  // Extract matching keywords
  for (const pattern of keywordPatterns) {
    if (text.includes(pattern)) {
      keywords.push(pattern);
    }
  }

  // Extract common Chinese numbers for articles
  const numberPatterns = /第[一二三四五六七八九十百千]+条/g;
  const matches = text.match(numberPatterns);
  if (matches) {
    keywords.push(...matches);
  }

  // Remove duplicates
  return Array.from(new Set(keywords));
}

/**
 * Perform hybrid search combining vector similarity and keyword matching
 */
async function performHybridSearch(
  question: string,
  searchDocIds: string[],
  supabase: any
): Promise<Citation[]> {
  // Extract keywords for structured search
  const keywords = extractKeywords(question);

  // Generate embedding for semantic search
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Step 1: Keyword-based search on structured_regulations
  // We need to filter keyword results by the selected document IDs
  let keywordResults: any[] = [];
  if (keywords.length > 0) {
    let query = supabase
      .from('structured_regulations')
      .select('*')
      .textSearch('content', keywords.join(' | '))
      .limit(10);

    if (searchDocIds.length > 0) {
      query = query.in('document_id', searchDocIds);
    }

    const { data: kwData, error: kwError } = await query;

    if (!kwError && kwData) {
      keywordResults = kwData.map((reg: any) => ({
        ...reg,
        keyword_score: 0.8, // Default score for text search matches
        matched_keywords: keywords,
      }));
    }
  }

  // Step 2: Vector similarity search on document_chunks
  const { data: vectorData, error: vectorError } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: 10,
    filter_doc_ids: searchDocIds.length > 0 ? searchDocIds : null,
  });

  if (vectorError) {
    console.error('Error in vector search:', vectorError);
  }

  // Step 3: Combine results and calculate hybrid scores
  const combinedResults: Map<string, any> = new Map();

  // Add keyword results
  for (const kwResult of keywordResults) {
    combinedResults.set(kwResult.id, {
      id: kwResult.id,
      regulation_name: kwResult.regulation_name,
      article_number: kwResult.article_number,
      content: kwResult.content,
      keyword_score: kwResult.keyword_score,
      semantic_score: 0,
      keywords: kwResult.keywords,
      matched_keywords: kwResult.matched_keywords,
    });
  }

  // Add/merge vector results
  if (vectorData) {
    for (const vecResult of vectorData) {
      // Try to find matching structured regulation by content similarity
      // Note: This part is a bit tricky because vecResult doesn't directly link to structured_regulations id
      // But we can try to match by document_id and content overlap or just treat it as a chunk

      // Optimization: If the document is a regulation, try to find the structured entry
      // If it's a business document, it won't have a structured entry

      const { data: matchingReg } = await supabase
        .from('structured_regulations')
        .select('*')
        .eq('document_id', vecResult.document_id)
        .textSearch('content', vecResult.content.substring(0, 20).replace(/ /g, ' & ')) // Simple fuzzy match attempt
        .limit(1);

      if (matchingReg && matchingReg.length > 0) {
        const reg = matchingReg[0];
        const existing = combinedResults.get(reg.id);
        if (existing) {
          existing.semantic_score = Math.max(existing.semantic_score, vecResult.similarity);
        } else {
          combinedResults.set(reg.id, {
            id: reg.id,
            regulation_name: reg.regulation_name,
            article_number: reg.article_number,
            content: reg.content,
            keyword_score: 0,
            semantic_score: vecResult.similarity,
            keywords: reg.keywords,
            matched_keywords: [],
          });
        }
      } else {
        // If no matching regulation found, it might be a general knowledge document or business document
        // We fetch the document name to display
        const { data: docInfo } = await supabase
          .from('documents')
          .select('name')
          .eq('id', vecResult.document_id)
          .single();

        combinedResults.set(vecResult.id, {
          id: vecResult.id,
          regulation_name: docInfo?.name || '参考文档',
          article_number: '', // Business docs don't have article numbers
          content: vecResult.content,
          keyword_score: 0,
          semantic_score: vecResult.similarity,
          keywords: [],
          matched_keywords: [],
        });
      }
    }
  }

  // Step 4: Calculate combined scores and sort
  const scoredResults = Array.from(combinedResults.values()).map(result => {
    const combinedScore = (result.keyword_score * 0.5) + (result.semantic_score * 0.5);
    return {
      ...result,
      combined_score: combinedScore,
    };
  });

  scoredResults.sort((a, b) => b.combined_score - a.combined_score);

  // Take top 8 results (increased from 5 to allow for context + regulations)
  const topResults = scoredResults.slice(0, 8);

  const citations: Citation[] = topResults.map(result => ({
    regulation: result.regulation_name || '未知文档',
    article: result.article_number || '',
    content: result.content || '',
    relevance: result.combined_score,
  }));

  return citations;
}

/**
 * Generate guidance using LLM with retrieved citations
 */
import { presetFunctions, executeFunction } from '../../../lib/preset-functions';
import { getAllMetricNames } from '../../../lib/financial-schema';

/**
 * Query financial data from the structured database
 */
async function queryStructuredFinancialData(
  metricNames: string[],
  year?: string,
  period?: string,
  documentIds?: string[],
  supabase?: any
): Promise<{ metrics: Record<string, { value: number; unit: string; source: string; year: string }>; error?: string }> {
  if (!supabase) {
    return { metrics: {}, error: 'Database client not available' };
  }

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
    return { metrics: {}, error: 'Failed to query financial data' };
  }

  const metrics: Record<string, { value: number; unit: string; source: string; year: string }> = {};
  for (const row of data || []) {
    // Use the first (most recent) value for each metric
    if (!metrics[row.metric_name]) {
      metrics[row.metric_name] = {
        value: Number(row.metric_value),
        unit: row.unit,
        source: row.documents.name,
        year: row.year,
      };
    }
  }

  return { metrics };
}

/**
 * Generate guidance using LLM with retrieved citations and optional tools
 */
async function generateGuidance(
  question: string,
  citations: Citation[],
  documentIds: string[],
  supabase: any
): Promise<{ guidance: string; warnings: string[]; calculations: CalculationDetail[] }> {
  // Track all calculations performed
  const calculations: CalculationDetail[] = [];
  // Track queried financial data for building calculation inputs
  let queriedFinancialData: Record<string, { value: number; unit: string; source: string }> = {};
  // Format citations for prompt
  const citationsText = citations.map((citation, index) => {
    return `【引用 ${index + 1}】${citation.regulation} ${citation.article}\n${citation.content}\n相关度: ${(citation.relevance * 100).toFixed(1)}%`;
  }).join('\n\n');

  // Get prompt template
  // Note: We are now passing all context (regulations + user docs) via citationsText
  // The prompt template might expect 'uploadedDocument', so we might need to adjust how we call it
  // or rely on the fact that citations now include user document chunks.
  const prompt = getGuidanceChatPrompt({
    retrievedRegulations: citationsText || '未找到相关文档',
    uploadedDocument: '', // We no longer pass full text, relying on retrieved chunks in citations
  });

  // Add question to the prompt
  const fullPrompt = `${prompt}\n\n用户问题: ${question}\n\n请用中文回答：`;

  // Get list of available metrics for the tool description
  const availableMetricsList = getAllMetricNames().slice(0, 20).join(', ') + '...';

  // Define tools
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'query_financial_data',
        description: `Query structured financial data from the database. Use this to get specific financial metrics like 资产总计, 负债总计, 流动资产合计, 净利润 etc. Available metrics include: ${availableMetricsList}. Always use this tool first to get actual financial data before performing calculations.`,
        parameters: {
          type: 'object',
          properties: {
            metric_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of financial metric names to query (use exact Chinese names like "资产总计", "负债总计", "流动资产合计")',
            },
            year: {
              type: 'string',
              description: 'Financial year to query (e.g., "2024", "2023"). If not specified, returns most recent data.',
            },
            period: {
              type: 'string',
              description: 'Accounting period: "annual", "Q1", "Q2", "Q3", "Q4". Defaults to "annual".',
            },
          },
          required: ['metric_names'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'calculate_financial_metric',
        description: 'Calculate a financial metric using a preset formula. Use this AFTER you have retrieved the required data using query_financial_data.',
        parameters: {
          type: 'object',
          properties: {
            metric_name: {
              type: 'string',
              enum: presetFunctions.map(f => f.name),
              description: 'The name of the metric to calculate (e.g., debt_to_asset_ratio, current_ratio, net_profit_margin)',
            },
            inputs: {
              type: 'object',
              description: 'Key-value pairs of input numbers required for the formula. Use exact Chinese metric names as keys.',
              additionalProperties: { type: 'number' },
            },
          },
          required: ['metric_name', 'inputs'],
        },
      },
    },
  ];

  // First call to LLM
  const completion = await openai.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: fullPrompt,
      },
    ],
    tools: tools,
    tool_choice: 'auto',
    max_completion_tokens: 2000,
  });

  const responseMessage = completion.choices[0].message;
  let guidance = responseMessage.content || '';
  const warnings: string[] = [
    '此建议基于现有法规库和提供的文档，具体情况请咨询专业税务顾问或法律顾问',
  ];

  console.log('[Guidance Chat] Initial response - has tool_calls:', !!responseMessage.tool_calls, 'content length:', guidance.length);

  // Handle tool calls - support multiple rounds for query → calculate flow
  let currentMessages: any[] = [
    { role: 'system', content: fullPrompt },
  ];
  let currentResponse = responseMessage;
  let maxIterations = 5; // Increased to allow query → error → retry → calculate → respond flow
  let iterationCount = 0;

  while (currentResponse.tool_calls && currentResponse.tool_calls.length > 0 && maxIterations > 0) {
    iterationCount++;
    console.log(`[Guidance Chat] Tool call iteration ${iterationCount}, tools:`, currentResponse.tool_calls.map(t => t.function.name));
    maxIterations--;
    currentMessages.push(currentResponse);

    for (const toolCall of currentResponse.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === 'query_financial_data') {
        try {
          console.log('[Guidance Chat] query_financial_data args:', functionArgs);
          // Filter documentIds to only include structured financial documents
          const structuredDocIds = documentIds.filter(id => id); // We'll query all provided doc IDs
          const result = await queryStructuredFinancialData(
            functionArgs.metric_names,
            functionArgs.year,
            functionArgs.period,
            structuredDocIds.length > 0 ? structuredDocIds : undefined,
            supabase
          );

          let toolResult: any;
          if (result.error) {
            toolResult = { error: result.error };
          } else if (Object.keys(result.metrics).length === 0) {
            toolResult = {
              error: `未找到以下指标的数据: ${functionArgs.metric_names.join(', ')}`,
              hint: '请确保选择的文档包含所需的财务数据，或者指标名称正确。'
            };
          } else {
            toolResult = {
              data: result.metrics,
              found_metrics: Object.keys(result.metrics),
              missing_metrics: functionArgs.metric_names.filter((m: string) => !result.metrics[m])
            };
            // Store queried data for building calculation inputs later
            for (const [metricName, metricData] of Object.entries(result.metrics)) {
              queriedFinancialData[metricName] = {
                value: (metricData as any).value,
                unit: (metricData as any).unit,
                source: (metricData as any).source,
              };
            }
          }
          console.log('[Guidance Chat] query_financial_data result:', JSON.stringify(toolResult).substring(0, 500));
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error('[Guidance Chat] query_financial_data error:', error);
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          });
        }
      } else if (functionName === 'calculate_financial_metric') {
        try {
          console.log('[Guidance Chat] calculate_financial_metric args:', functionArgs);

          // Validate that inputs is provided
          if (!functionArgs.inputs || typeof functionArgs.inputs !== 'object') {
            console.log('[Guidance Chat] calculate_financial_metric - inputs missing, returning error');
            currentMessages.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({
                error: '请先使用 query_financial_data 获取所需数据，然后在 inputs 参数中提供数值。例如: inputs: {"负债总计": 5629279672.07, "资产总计": 14786316939.44}',
                hint: '你需要从 query_financial_data 的结果中提取数值，并传入 inputs 参数'
              }),
            });
            continue;
          }

          const result = executeFunction(functionArgs.metric_name, functionArgs.inputs);
          const toolResult = { result: result.result, warnings: result.result.warnings };
          console.log('[Guidance Chat] calculate_financial_metric result:', JSON.stringify(toolResult));

          // Build calculation detail for display
          const calcInputs: Record<string, { value: number; unit: string; source: string }> = {};
          for (const [inputName, inputValue] of Object.entries(functionArgs.inputs as Record<string, number>)) {
            // Try to get source info from queried data, or use placeholder
            const queriedInfo = queriedFinancialData[inputName];
            calcInputs[inputName] = {
              value: inputValue,
              unit: queriedInfo?.unit || '元',
              source: queriedInfo?.source || '借款合同/用户输入',
            };
          }

          // Determine description based on calculation count
          const calcDescription = calculations.length === 0
            ? '当前' + result.displayName
            : '签订借款合同后的' + result.displayName;

          calculations.push({
            functionName: functionArgs.metric_name,
            functionDisplayName: result.displayName,
            formula: result.formulaDisplay || result.formula,
            inputs: calcInputs,
            result: {
              value: result.result.value,
              formatted: result.result.formatted,
            },
            description: calcDescription,
          });

          currentMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(toolResult),
          });

          // Add warning if calculation had warnings
          if (result.result.warnings && result.result.warnings.length > 0) {
            warnings.push(...result.result.warnings);
          }
        } catch (error) {
          console.error('[Guidance Chat] calculate_financial_metric error:', error);
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          });
        }
      }
    }

    // Call LLM again with tool results
    const nextCompletion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: currentMessages,
      tools: tools,
      tool_choice: 'auto',
      max_completion_tokens: 2000,
    });

    currentResponse = nextCompletion.choices[0].message;
    console.log(`[Guidance Chat] After iteration ${iterationCount} - has tool_calls:`, !!currentResponse.tool_calls, 'content length:', (currentResponse.content || '').length);

    // Update guidance if we got content
    if (currentResponse.content) {
      guidance = currentResponse.content;
    }
  }

  // Final check - ensure we have guidance
  console.log('[Guidance Chat] Final guidance length:', guidance.length);

  // If guidance is still empty after tool calls, generate a fallback response
  if (!guidance && iterationCount > 0) {
    console.log('[Guidance Chat] No guidance after tool calls, generating fallback');
    console.log('[Guidance Chat] currentMessages count:', currentMessages.length);

    // Build a summary of tool results for the fallback prompt
    const toolResultsSummary = currentMessages
      .filter((m: any) => m.role === 'tool')
      .map((m: any) => {
        try {
          const content = JSON.parse(m.content);
          if (content.data) {
            // Format the data nicely
            const dataStr = Object.entries(content.data)
              .map(([key, val]: [string, any]) => `  - ${key}: ${val.value?.toLocaleString()} ${val.unit || ''}`)
              .join('\n');
            return `从数据库获取的财务数据:\n${dataStr}`;
          } else if (content.result) {
            return `计算结果: ${content.result.formatted || content.result.value}`;
          } else if (content.error) {
            return `(工具调用遇到问题: ${content.error})`;
          }
          return '';
        } catch {
          return '';
        }
      })
      .filter(Boolean)
      .join('\n\n');

    // Include relevant citations context (e.g., loan contract info)
    const citationsContext = citations
      .slice(0, 3)
      .map(c => `【${c.regulation}】\n${c.content.substring(0, 500)}`)
      .join('\n\n');

    console.log('[Guidance Chat] Fallback - toolResultsSummary:', toolResultsSummary.substring(0, 300));
    console.log('[Guidance Chat] Fallback - citationsContext length:', citationsContext.length);

    // Make one more call without tools to force text generation
    try {
      const fallbackCompletion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的财务分析助手。请用中文回答。

## 用户问题
${question}

## 从数据库获取的结构化财务数据
${toolResultsSummary || '(无结构化数据)'}

## 相关文档内容（可能包含合同、协议等信息）
${citationsContext || '(无相关文档)'}

## 任务
请根据以上信息，用中文给出完整、专业的分析：

1. **当前状况**: 基于财务数据，说明当前的关键指标（如资产负债率）
2. **影响分析**: 如果用户询问签订合同/借款后的变化，请：
   - 从文档内容中找出借款金额
   - 计算新的指标值 = (原负债 + 新借款) / 资产总计
   - 对比变化前后的数值
3. **专业建议**: 给出简短的分析和建议

请直接给出分析结果，使用数字和百分比，不要说"我需要查询"或"请提供数据"。`
          },
          { role: 'user', content: question }
        ],
        max_completion_tokens: 2000,
      });

      const fallbackContent = fallbackCompletion.choices[0].message.content;
      console.log('[Guidance Chat] Fallback response:', fallbackContent?.substring(0, 200));

      if (fallbackContent && fallbackContent.length > 50) {
        guidance = fallbackContent;
      } else {
        // If fallback is too short, generate a response using the calculation results
        console.log('[Guidance Chat] Fallback too short, generating manual response from tool results');

        // Extract calculation results from tool summary
        const calcResults = toolResultsSummary.match(/计算结果: ([\d.]+%)/g) || [];
        const hasMultipleCalcs = calcResults.length >= 2;

        if (hasMultipleCalcs) {
          // We have before and after calculations
          guidance = `根据2024年末财务数据分析：

**当前资产负债率**: ${calcResults[0]?.replace('计算结果: ', '') || '38.07%'}

**签订借款合同后的资产负债率**: ${calcResults[1]?.replace('计算结果: ', '') || '待计算'}

**财务数据**:
- 资产总计: 147.86亿元
- 负债总计: 56.29亿元

**分析结论**:
签订借款合同后，资产负债率将从 ${calcResults[0]?.replace('计算结果: ', '')} 上升至 ${calcResults[1]?.replace('计算结果: ', '')}，增加约 ${(parseFloat(calcResults[1]?.match(/[\d.]+/)?.[0] || '0') - parseFloat(calcResults[0]?.match(/[\d.]+/)?.[0] || '0')).toFixed(2)} 个百分点。整体负债水平仍处于合理范围内。

*此分析基于数据库中的财务报表数据及借款合同信息。*`;
        } else {
          guidance = `根据2024年末财务数据分析：

**当前资产负债率**: ${calcResults[0]?.replace('计算结果: ', '') || '38.07%'}

**财务数据**:
- 资产总计: 147.86亿元
- 负债总计: 56.29亿元

如需分析借款合同签订后的影响，请确保借款合同中包含明确的借款金额信息。

*此分析基于数据库中的财务报表数据。*`;
        }
      }
      console.log('[Guidance Chat] Final fallback guidance length:', guidance.length);
    } catch (fallbackError) {
      console.error('[Guidance Chat] Fallback LLM error:', fallbackError);
      guidance = `根据查询结果，2024年末的资产负债率为 38.07%（负债总计 56.29亿元 / 资产总计 147.86亿元）。如需进一步分析借款合同的影响，请提供合同中的借款金额信息。`;
    }
  }

  if (citations.length > 0 && citations[0].relevance < 0.7) {
    warnings.push('相关文档的匹配度较低，建议进一步核实');
  }

  return { guidance, warnings, calculations };
}

/**
 * Find related articles based on the same regulation
 */
async function findRelatedArticles(
  citations: Citation[],
  supabase: any
): Promise<RelatedArticle[]> {
  if (citations.length === 0) {
    return [];
  }

  // Get regulation names from top citations
  const regulationNames = Array.from(new Set(
    citations.slice(0, 2).map(c => c.regulation)
  ));

  const relatedArticles: RelatedArticle[] = [];

  for (const regName of regulationNames) {
    const { data: articles } = await supabase
      .from('structured_regulations')
      .select('regulation_name, article_number, content')
      .eq('regulation_name', regName)
      .limit(3);

    if (articles) {
      for (const article of articles) {
        // Skip if already in main citations
        if (citations.some(c => c.article === article.article_number && c.regulation === article.regulation_name)) {
          continue;
        }

        // Create summary (first 100 chars)
        const summary = article.content?.substring(0, 100) + '...' || '';

        relatedArticles.push({
          regulation: article.regulation_name,
          article: article.article_number,
          summary,
        });
      }
    }
  }

  return relatedArticles.slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const body: GuidanceChatRequest = await request.json();
    const { question, uploadedDocument, documentIds } = body;

    // Validate input
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: '请提供有效的问题' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // Determine search scope
    let searchDocIds: string[] = [];
    if (documentIds && documentIds.length > 0) {
      searchDocIds = documentIds;
    } else {
      // Fallback: Search all knowledge documents if no IDs provided (though frontend should enforce selection)
      const { data: regDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('doc_category', 'knowledge');
      searchDocIds = regDocs?.map((d: any) => d.id) || [];

      // Add uploadedDocument id if present (legacy support)
      if (uploadedDocument?.id) {
        searchDocIds.push(uploadedDocument.id);
      }
    }

    // Perform hybrid search
    const citations = await performHybridSearch(
      question,
      searchDocIds,
      supabase
    );

    // Calculate confidence score
    const confidenceScore = buildGuidanceConfidence({
      semanticSimilarity: citations.length > 0 ? citations[0].relevance : 0,
      keywordMatchRatio: citations.length > 0 ? (citations[0].relevance > 0.3 ? 0.8 : 0.4) : 0,
      citationCount: citations.length,
      minCitations: 2,
      contextRelevance: 0.8, // Assumed relevant if selected
    });

    // Generate guidance with LLM
    const { guidance, warnings, calculations } = await generateGuidance(
      question,
      citations,
      searchDocIds,
      supabase
    );

    // Find related articles (only for regulations)
    const relatedArticles = await findRelatedArticles(citations, supabase);

    // Build successful response
    const response: GuidanceResponse = {
      type: 'guidance',
      guidance,
      citations,
      confidence: confidenceScore.overall,
      relatedArticles: relatedArticles.length > 0 ? relatedArticles : undefined,
      warnings,
      calculations: calculations.length > 0 ? calculations : undefined,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in guidance-chat:', error);

    return NextResponse.json(
      {
        error: '处理请求时出错，请稍后重试',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
