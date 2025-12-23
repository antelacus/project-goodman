/**
 * Guidance Chat Workflow Steps
 *
 * This file contains step functions for the guidance chat workflow.
 * Each step is a pure function: (state) => Promise<state>
 */

import OpenAI from "openai";
import { createServerSupabaseClient } from "../../supabase";
import { getGuidanceChatPrompt } from "../../prompts";
import { buildGuidanceConfidence } from "../../confidence-scoring";
import { presetFunctions, executeFunction } from "../../preset-functions";
import { getAllMetricNames } from "../../financial-schema";
import type { GuidanceChatState } from "../../types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Query business context from business_info documents
 */
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

/**
 * Extract keywords from question using simple Chinese tokenization
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];

  // Common financial/tax keywords
  const keywordPatterns = [
    "增值税",
    "所得税",
    "企业所得税",
    "个人所得税",
    "印花税",
    "消费税",
    "税率",
    "税收",
    "纳税",
    "征收",
    "免税",
    "减税",
    "退税",
    "会计",
    "准则",
    "核算",
    "计量",
    "确认",
    "披露",
    "资产",
    "负债",
    "权益",
    "收入",
    "费用",
    "利润",
    "审计",
    "报告",
    "报表",
    "财务",
    "发票",
    "凭证",
    "账簿",
    "账务",
    "股权",
    "投资",
    "融资",
    "借款",
    "合同",
    "协议",
    "条款",
    "软件",
    "技术",
    "服务",
    "销售",
    "采购",
    "研发",
    "开发",
    "生产",
    "制造",
    "进口",
    "出口",
    "关税",
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
 * Query financial data from the structured database
 */
export async function queryStructuredFinancialData(
  metricNames: string[],
  year?: string,
  period?: string,
  documentIds?: string[]
): Promise<{
  metrics: Record<
    string,
    { value: number; unit: string; source: string; year: string }
  >;
  error?: string;
}> {
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

  // Order by most recent first
  query = query.order("year", { ascending: false });
  query = query.order("period", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error querying financial data:", error);
    return { metrics: {}, error: "Failed to query financial data" };
  }

  const metrics: Record<
    string,
    { value: number; unit: string; source: string; year: string }
  > = {};
  for (const row of (data || []) as Array<{
    metric_name: string;
    metric_value: number;
    unit: string;
    year: string;
    period: string;
    document_id: string;
    documents: { id: string; name: string };
  }>) {
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

// ============================================================================
// Step Functions
// ============================================================================

/**
 * Step 1: Perform hybrid search (vector + keyword)
 */
export async function performHybridSearch(
  state: GuidanceChatState
): Promise<GuidanceChatState> {
  const { question, documentIds, uploadedDocument } = state.input;
  const supabase = createServerSupabaseClient();

  // Query business context
  const businessContext = await queryBusinessContext();
  if (businessContext) {
    console.log(
      `[Guidance Chat] Found business context: ${businessContext.length} chars`
    );
  }

  // Determine search scope
  let searchDocIds: string[] = [];

  // Use selected documents if available (from document-selection step)
  if (state.documentSelection?.selectedDocuments) {
    searchDocIds = state.documentSelection.selectedDocuments.map(d => d.documentId);
    console.log(`[Guidance Chat] Using ${searchDocIds.length} auto-selected documents.`);
  }
  // Legacy/Manual fallback: Check input documentIds directly if no selection result (shouldn't happen if step ran)
  else if (documentIds && documentIds.length > 0) {
    searchDocIds = documentIds;
  } else {
    // Fallback: Search all knowledge documents
    const { data: regDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("doc_category", "knowledge");
    searchDocIds = regDocs?.map((d: any) => d.id) || [];
  }

  // Add uploadedDocument id if present (legacy support)
  if (uploadedDocument?.id && !searchDocIds.includes(uploadedDocument.id)) {
    searchDocIds.push(uploadedDocument.id);
  }

  // Extract keywords for structured search
  const keywords = extractKeywords(question);

  // Generate embedding for semantic search
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Keyword-based search on structured_regulations
  let keywordResults: any[] = [];
  if (keywords.length > 0) {
    let query = supabase
      .from("structured_regulations")
      .select("*")
      .textSearch("content", keywords.join(" | "))
      .limit(10);

    if (searchDocIds.length > 0) {
      query = query.in("document_id", searchDocIds);
    }

    const { data: kwData, error: kwError } = await query;

    if (!kwError && kwData) {
      keywordResults = kwData.map((reg: any) => ({
        ...reg,
        keyword_score: 0.8,
        matched_keywords: keywords,
      }));
    }
  }

  // Vector similarity search on document_chunks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: vectorData, error: vectorError } = await (supabase.rpc as any)(
    "match_documents",
    {
      query_embedding: queryEmbedding,
      match_count: 10,
      filter_doc_ids: searchDocIds.length > 0 ? searchDocIds : null,
    }
  );

  if (vectorError) {
    console.error("Error in vector search:", vectorError);
  }

  // Combine results and calculate hybrid scores
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
    for (const vecResult of vectorData as Array<{
      id: string;
      document_id: string;
      content: string;
      similarity: number;
    }>) {
      const { data: matchingReg } = await supabase
        .from("structured_regulations")
        .select("*")
        .eq("document_id", vecResult.document_id)
        .textSearch(
          "content",
          vecResult.content.substring(0, 20).replace(/ /g, " & ")
        )
        .limit(1);

      if (matchingReg && matchingReg.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reg = matchingReg[0] as any;
        const existing = combinedResults.get(reg.id);
        if (existing) {
          existing.semantic_score = Math.max(
            existing.semantic_score,
            vecResult.similarity
          );
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
        // Business document or general knowledge document
        const { data: docInfo } = await supabase
          .from("documents")
          .select("name")
          .eq("id", vecResult.document_id)
          .single();

        combinedResults.set(vecResult.id, {
          id: vecResult.id,
          regulation_name: (docInfo as { name: string } | null)?.name || "参考文档",
          article_number: "",
          content: vecResult.content,
          keyword_score: 0,
          semantic_score: vecResult.similarity,
          keywords: [],
          matched_keywords: [],
        });
      }
    }
  }

  // Calculate combined scores and sort
  const scoredResults = Array.from(combinedResults.values()).map((result) => {
    const combinedScore =
      result.keyword_score * 0.5 + result.semantic_score * 0.5;
    return {
      ...result,
      combined_score: combinedScore,
    };
  });

  scoredResults.sort((a, b) => b.combined_score - a.combined_score);

  // Take top 8 results
  const topResults = scoredResults.slice(0, 8);

  const vectorResults = vectorData
    ? vectorData.slice(0, 10).map((r: any) => ({
      chunk_id: r.id,
      content: r.content,
      similarity: r.similarity,
      regulation: r.metadata?.regulation || "",
      article: r.metadata?.article || "",
    }))
    : [];

  const keywordMappedResults = keywordResults.map((r) => ({
    regulation_id: r.id,
    regulation_name: r.regulation_name,
    article_number: r.article_number,
    article_content: r.content,
    relevance: r.keyword_score,
  }));

  const combinedCitations = topResults.map((result) => ({
    regulation: result.regulation_name || "未知文档",
    article: result.article_number || "",
    content: result.content || "",
    relevance: result.combined_score,
  }));

  return {
    ...state,
    search: {
      keywords: keywords,
      vectorResults: vectorResults,
      keywordResults: keywordMappedResults,
      combinedResults: combinedCitations,
      businessContext: businessContext,
    },
    meta: {
      ...state.meta,
      currentStep: "perform_hybrid_search",
    },
  };
}

/**
 * Step 2: Generate guidance using LLM with tools
 */
export async function generateGuidance(
  state: GuidanceChatState
): Promise<GuidanceChatState> {
  const { question, documentIds } = state.input;
  const { combinedResults, businessContext } = state.search;

  const supabase = createServerSupabaseClient();
  const calculations: any[] = [];
  let queriedFinancialData: Record<
    string,
    { value: number; unit: string; source: string }
  > = {};

  // Format citations for prompt
  const citationsText = combinedResults
    .map((citation, index) => {
      return `【引用 ${index + 1}】${citation.regulation} ${citation.article}\n${citation.content}\n相关度: ${(citation.relevance * 100).toFixed(1)}%`;
    })
    .join("\n\n");

  // Get prompt template
  const prompt = getGuidanceChatPrompt({
    retrievedRegulations: citationsText || "未找到相关文档",
    uploadedDocument: "",
    businessContext: businessContext || "",
  });

  const fullPrompt = `${prompt}\n\n用户问题: ${question}\n\n请用中文回答：`;

  // Get available metrics for tool description
  const availableMetricsList =
    getAllMetricNames().slice(0, 20).join(", ") + "...";

  // Define tools
  const tools = [
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
                "The name of the metric to calculate (e.g., debt_to_asset_ratio, current_ratio, net_profit_margin)",
            },
            inputs: {
              type: "object",
              description:
                "Key-value pairs of input numbers required for the formula. Use exact Chinese metric names as keys.",
              additionalProperties: { type: "number" },
            },
          },
          required: ["metric_name", "inputs"],
        },
      },
    },
  ];

  // First call to LLM
  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: fullPrompt,
      },
    ],
    tools: tools,
    tool_choice: "auto",
    max_completion_tokens: 2000,
  });

  const responseMessage = completion.choices[0].message;
  let guidance = responseMessage.content || "";

  console.log(
    "[Guidance Chat] Initial response - has tool_calls:",
    !!responseMessage.tool_calls,
    "content length:",
    guidance.length
  );

  // Handle tool calls - support multiple rounds
  let currentMessages: any[] = [{ role: "system", content: fullPrompt }];
  let currentResponse = responseMessage;
  let maxIterations = 5;
  let iterationCount = 0;

  while (
    currentResponse.tool_calls &&
    currentResponse.tool_calls.length > 0 &&
    maxIterations > 0
  ) {
    iterationCount++;
    console.log(
      `[Guidance Chat] Tool call iteration ${iterationCount}, tools:`,
      currentResponse.tool_calls.map((t) => t.function.name)
    );
    maxIterations--;
    currentMessages.push(currentResponse);

    for (const toolCall of currentResponse.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === "query_financial_data") {
        try {
          console.log("[Guidance Chat] query_financial_data args:", functionArgs);
          const structuredDocIds = documentIds?.filter((id: string) => id) || [];
          const result = await queryStructuredFinancialData(
            functionArgs.metric_names,
            functionArgs.year,
            functionArgs.period,
            structuredDocIds.length > 0 ? structuredDocIds : undefined
          );

          let toolResult: any;
          if (result.error) {
            toolResult = { error: result.error };
          } else if (Object.keys(result.metrics).length === 0) {
            toolResult = {
              error: `未找到以下指标的数据: ${functionArgs.metric_names.join(", ")}`,
              hint: "请确保选择的文档包含所需的财务数据，或者指标名称正确。",
            };
          } else {
            toolResult = {
              data: result.metrics,
              found_metrics: Object.keys(result.metrics),
              missing_metrics: functionArgs.metric_names.filter(
                (m: string) => !result.metrics[m]
              ),
            };
            // Store queried data
            for (const [metricName, metricData] of Object.entries(
              result.metrics
            )) {
              queriedFinancialData[metricName] = {
                value: (metricData as any).value,
                unit: (metricData as any).unit,
                source: (metricData as any).source,
              };
            }
          }
          console.log(
            "[Guidance Chat] query_financial_data result:",
            JSON.stringify(toolResult).substring(0, 500)
          );
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error("[Guidance Chat] query_financial_data error:", error);
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          });
        }
      } else if (functionName === "calculate_financial_metric") {
        try {
          console.log("[Guidance Chat] calculate_financial_metric args:", functionArgs);

          if (
            !functionArgs.inputs ||
            typeof functionArgs.inputs !== "object"
          ) {
            console.log(
              "[Guidance Chat] calculate_financial_metric - inputs missing"
            );
            currentMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify({
                error:
                  '请先使用 query_financial_data 获取所需数据，然后在 inputs 参数中提供数值。例如: inputs: {"负债总计": 5629279672.07, "资产总计": 14786316939.44}',
                hint: "你需要从 query_financial_data 的结果中提取数值，并传入 inputs 参数",
              }),
            });
            continue;
          }

          const result = executeFunction(
            functionArgs.metric_name,
            functionArgs.inputs
          );
          const toolResult = {
            result: result.result,
            warnings: result.result.warnings,
          };
          console.log(
            "[Guidance Chat] calculate_financial_metric result:",
            JSON.stringify(toolResult)
          );

          // Build calculation detail
          const calcInputs: Record<
            string,
            { value: number; unit: string; source: string }
          > = {};
          for (const [inputName, inputValue] of Object.entries(
            functionArgs.inputs as Record<string, number>
          )) {
            const queriedInfo = queriedFinancialData[inputName];
            calcInputs[inputName] = {
              value: inputValue,
              unit: queriedInfo?.unit || "元",
              source: queriedInfo?.source || "借款合同/用户输入",
            };
          }

          const calcDescription =
            calculations.length === 0
              ? "当前" + result.displayName
              : "签订借款合同后的" + result.displayName;

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
            role: "tool",
            name: functionName,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error(
            "[Guidance Chat] calculate_financial_metric error:",
            error
          );
          currentMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: JSON.stringify({
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          });
        }
      }
    }

    // Call LLM again with tool results
    const nextCompletion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: currentMessages,
      tools: tools,
      tool_choice: "auto",
      max_completion_tokens: 2000,
    });

    currentResponse = nextCompletion.choices[0].message;
    console.log(
      `[Guidance Chat] After iteration ${iterationCount} - has tool_calls:`,
      !!currentResponse.tool_calls,
      "content length:",
      (currentResponse.content || "").length
    );

    if (currentResponse.content) {
      guidance = currentResponse.content;
    }
  }

  // Fallback if no guidance generated after tool calls
  if (!guidance && iterationCount > 0) {
    console.log(
      "[Guidance Chat] No guidance after tool calls, generating fallback"
    );

    const toolResultsSummary = currentMessages
      .filter((m: any) => m.role === "tool")
      .map((m: any) => {
        try {
          const content = JSON.parse(m.content);
          if (content.data) {
            const dataStr = Object.entries(content.data)
              .map(
                ([key, val]: [string, any]) =>
                  `  - ${key}: ${val.value?.toLocaleString()} ${val.unit || ""}`
              )
              .join("\n");
            return `从数据库获取的财务数据:\n${dataStr}`;
          } else if (content.result) {
            return `计算结果: ${content.result.formatted || content.result.value}`;
          } else if (content.error) {
            return `(工具调用遇到问题: ${content.error})`;
          }
          return "";
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join("\n\n");

    const citationsContext = combinedResults
      .slice(0, 3)
      .map((c) => `【${c.regulation}】\n${c.content.substring(0, 500)}`)
      .join("\n\n");

    try {
      const fallbackCompletion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `你是一个专业的财务分析助手。请用中文回答。

## 用户问题
${question}

## 从数据库获取的结构化财务数据
${toolResultsSummary || "(无结构化数据)"}

## 相关文档内容（可能包含合同、协议等信息）
${citationsContext || "(无相关文档)"}

## 任务
请根据以上信息，用中文给出完整、专业的分析：

1. **当前状况**: 基于财务数据，说明当前的关键指标（如资产负债率）
2. **影响分析**: 如果用户询问签订合同/借款后的变化，请：
   - 从文档内容中找出借款金额
   - 计算新的指标值 = (原负债 + 新借款) / 资产总计
   - 对比变化前后的数值
3. **专业建议**: 给出简短的分析和建议

请直接给出分析结果，使用数字和百分比，不要说"我需要查询"或"请提供数据"。`,
          },
          { role: "user", content: question },
        ],
        max_completion_tokens: 2000,
      });

      const fallbackContent = fallbackCompletion.choices[0].message.content;
      if (fallbackContent && fallbackContent.length > 50) {
        guidance = fallbackContent;
      }
    } catch (fallbackError) {
      console.error("[Guidance Chat] Fallback LLM error:", fallbackError);
      guidance = `根据查询结果，分析如下。如需进一步分析，请提供更多信息。`;
    }
  }

  const warnings = [
    "此建议基于现有法规库和提供的文档，具体情况请咨询专业税务顾问或法律顾问",
  ];

  if (
    combinedResults.length > 0 &&
    combinedResults[0].relevance < 0.7
  ) {
    warnings.push("相关文档的匹配度较低，建议进一步核实");
  }

  const toolCalls = currentMessages
    .filter((m: any) => m.tool_calls)
    .flatMap((m: any) =>
      m.tool_calls.map((tc: any) => ({
        functionName: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      }))
    );

  return {
    ...state,
    reasoning: {
      guidanceText: guidance,
      citations: combinedResults,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    },
    toolExecution:
      calculations.length > 0 ? { calculations: calculations } : undefined,
    meta: {
      ...state.meta,
      currentStep: "generate_guidance",
    },
  };
}

/**
 * Step 3: Find related articles
 */
export async function findRelatedArticles(
  state: GuidanceChatState
): Promise<GuidanceChatState> {
  const { citations } = state.reasoning;
  const supabase = createServerSupabaseClient();

  if (citations.length === 0) {
    return {
      ...state,
      relatedArticles: {
        articles: [],
      },
      meta: {
        ...state.meta,
        currentStep: "find_related_articles",
      },
    };
  }

  // Get regulation names from top citations
  const regulationNames = Array.from(
    new Set(citations.slice(0, 2).map((c) => c.regulation))
  );

  const relatedArticles: any[] = [];

  for (const regName of regulationNames) {
    const { data: articles } = await supabase
      .from("structured_regulations")
      .select("regulation_name, article_number, content")
      .eq("regulation_name", regName)
      .limit(3);

    if (articles) {
      for (const article of articles as Array<{
        regulation_name: string;
        article_number: string;
        content: string;
      }>) {
        // Skip if already in main citations
        if (
          citations.some(
            (c) =>
              c.article === article.article_number &&
              c.regulation === article.regulation_name
          )
        ) {
          continue;
        }

        // Create summary
        const summary = article.content?.substring(0, 100) + "..." || "";

        relatedArticles.push({
          regulation: article.regulation_name,
          article: article.article_number,
          summary,
        });
      }
    }
  }

  return {
    ...state,
    relatedArticles: {
      articles: relatedArticles.slice(0, 3),
    },
    meta: {
      ...state.meta,
      currentStep: "find_related_articles",
    },
  };
}

/**
 * Step 4: Evaluate confidence
 */
export async function evaluateConfidence(
  state: GuidanceChatState
): Promise<GuidanceChatState> {
  const { combinedResults } = state.search;

  const confidenceScore = buildGuidanceConfidence({
    semanticSimilarity:
      combinedResults.length > 0 ? combinedResults[0].relevance : 0,
    keywordMatchRatio:
      combinedResults.length > 0
        ? combinedResults[0].relevance > 0.3
          ? 0.8
          : 0.4
        : 0,
    citationCount: combinedResults.length,
    minCitations: 2,
    contextRelevance: 0.8,
  });

  const factors = [
    {
      name: "semantic_similarity",
      score: combinedResults.length > 0 ? combinedResults[0].relevance : 0,
      weight: 0.4,
    },
    {
      name: "citation_count",
      score: Math.min(combinedResults.length / 5, 1.0),
      weight: 0.3,
    },
    {
      name: "context_relevance",
      score: 0.8,
      weight: 0.3,
    },
  ];

  const threshold = 0.6;
  const passed = confidenceScore.overall >= threshold;

  return {
    ...state,
    confidence: {
      score: confidenceScore.overall,
      factors: factors,
      threshold: threshold,
      passed: passed,
      reason: !passed
        ? `置信度 ${confidenceScore.overall.toFixed(2)} 低于阈值 ${threshold}`
        : undefined,
    },
    meta: {
      ...state.meta,
      currentStep: "evaluate_confidence",
    },
  };
}

/**
 * Step 5: Generate response
 */
export async function generateResponse(
  state: GuidanceChatState
): Promise<GuidanceChatState> {
  const { guidanceText, citations } = state.reasoning;
  const { articles } = state.relatedArticles;
  const { score: confidenceScore } = state.confidence;
  const calculations = state.toolExecution?.calculations || [];

  const warnings = [
    "此建议基于现有法规库和提供的文档，具体情况请咨询专业税务顾问或法律顾问",
  ];

  if (citations.length > 0 && citations[0].relevance < 0.7) {
    warnings.push("相关文档的匹配度较低，建议进一步核实");
  }

  return {
    ...state,
    output: {
      type: "guidance",
      guidance: guidanceText,
      citations: citations,
      confidence: confidenceScore,
      relatedArticles: articles.length > 0 ? articles : undefined,
      warnings: warnings,
      calculations: calculations.length > 0 ? calculations : undefined,
    },
    meta: {
      ...state.meta,
      currentStep: "generate_response",
      endTime: Date.now(),
    },
  };
}
