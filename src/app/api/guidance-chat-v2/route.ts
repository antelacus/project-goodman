/**
 * Guidance Chat v2 API Route
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
import { getGuidanceChatV2Prompt } from '../../../lib/prompts';
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

interface GuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
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

/**
 * Generate guidance using LLM with retrieved citations and optional tools
 */
async function generateGuidance(
  question: string,
  citations: Citation[]
): Promise<{ guidance: string; warnings: string[] }> {
  // Format citations for prompt
  const citationsText = citations.map((citation, index) => {
    return `【引用 ${index + 1}】${citation.regulation} ${citation.article}\n${citation.content}\n相关度: ${(citation.relevance * 100).toFixed(1)}%`;
  }).join('\n\n');

  // Get prompt template
  // Note: We are now passing all context (regulations + user docs) via citationsText
  // The prompt template might expect 'uploadedDocument', so we might need to adjust how we call it
  // or rely on the fact that citations now include user document chunks.
  const prompt = getGuidanceChatV2Prompt({
    retrievedRegulations: citationsText || '未找到相关文档',
    uploadedDocument: '', // We no longer pass full text, relying on retrieved chunks in citations
  });

  // Add question to the prompt
  const fullPrompt = `${prompt}\n\n用户问题: ${question}\n\n请用中文回答：`;

  // Define tools
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'calculate_financial_metric',
        description: 'Calculate a financial metric using a preset formula. Use this when the user asks for a specific calculation.',
        parameters: {
          type: 'object',
          properties: {
            metric_name: {
              type: 'string',
              enum: presetFunctions.map(f => f.name),
              description: 'The name of the metric to calculate (e.g., current_ratio, net_profit_margin)',
            },
            inputs: {
              type: 'object',
              description: 'Key-value pairs of input numbers required for the formula',
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
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: fullPrompt,
      },
    ],
    tools: tools,
    tool_choice: 'auto',
    temperature: 0.3,
    max_tokens: 2000,
  });

  const responseMessage = completion.choices[0].message;
  let guidance = responseMessage.content || '';
  const warnings: string[] = [
    '此建议基于现有法规库和提供的文档，具体情况请咨询专业税务顾问或法律顾问',
  ];

  // Handle tool calls
  if (responseMessage.tool_calls) {
    const toolCalls = responseMessage.tool_calls;
    const messages: any[] = [
      { role: 'system', content: fullPrompt },
      responseMessage,
    ];

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === 'calculate_financial_metric') {
        try {
          const result = executeFunction(functionArgs.metric_name, functionArgs.inputs);

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(result),
          });

          // Add warning if calculation had warnings
          if (result.result.warnings) {
            warnings.push(...result.result.warnings);
          }
        } catch (error) {
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          });
        }
      }
    }

    // Second call to LLM with tool results
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.3,
      max_tokens: 2000,
    });

    guidance = secondResponse.choices[0].message.content || '';
  }

  if (citations.length > 0 && citations[0].relevance < 0.7) {
    warnings.push('相关文档的匹配度较低，建议进一步核实');
  }

  return { guidance, warnings };
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
    const { guidance, warnings } = await generateGuidance(
      question,
      citations
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
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in guidance-chat-v2:', error);

    return NextResponse.json(
      {
        error: '处理请求时出错，请稍后重试',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
