export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getFinancialAnalysisPrompt } from "../../../lib/prompts";
import { createServerSupabaseClient } from "../../../lib/supabase";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 定义类型
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, documentIds = [], chatHistory = [] }: {
      question: string;
      documentIds: string[];
      chatHistory: ChatMessage[];
    } = body;

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // 1. 获取相关文档内容
    let relevantContext = "";
    let knowledgeDocNames: string[] = [];

    // 处理知识型文档（从Supabase加载）
    if (documentIds.length > 0) {
      // 为问题生成embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
        encoding_format: "float",
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 使用Supabase的向量搜索功能
      // 对每个选中的文档进行搜索，获取最相关的chunks
      const { data: similarChunks, error: searchError } = await supabase.rpc(
        'match_documents',
        // @ts-ignore - Supabase type inference issue
        {
          query_embedding: queryEmbedding,
          match_count: 3,
          filter_doc_ids: documentIds,
        }
      );

      if (searchError) {
        console.error('Vector search error:', searchError);
        throw new Error(`Vector search failed: ${searchError.message}`);
      }

      if (similarChunks && (similarChunks as any[]).length > 0) {
        // 获取文档信息用于显示文档名称
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select('id, name, summary')
          .in('id', documentIds);

        if (docsError) {
          console.error('Error fetching documents:', docsError);
        }

        // 创建文档ID到名称的映射
        const docIdToName = new Map(
          ((documents || []) as any[]).map(doc => [doc.id, doc.name])
        );

        // 创建文档ID到摘要的映射
        const docIdToSummary = new Map(
          ((documents || []) as any[]).map(doc => [doc.id, doc.summary])
        );

        // 按文档分组chunks
        const chunksByDocument = new Map<string, any[]>();
        for (const chunk of (similarChunks as any[])) {
          if (!chunksByDocument.has(chunk.document_id)) {
            chunksByDocument.set(chunk.document_id, []);
          }
          chunksByDocument.get(chunk.document_id)!.push(chunk);
        }

        // 构建上下文文本
        for (const [docId, chunks] of chunksByDocument) {
          const docName = docIdToName.get(docId) || 'Unknown';
          const summary = docIdToSummary.get(docId) as any;
          knowledgeDocNames.push(docName);

          relevantContext += `\n知识文档: ${docName}\n`;
          relevantContext += `类型: ${summary?.document_type || '未知'}\n`;
          relevantContext += `相关内容: ${chunks.map(chunk => chunk.content).join(" ")}\n`;
        }
      }
    }

    // 2. 构建对话上下文
    const conversationHistory = chatHistory
      .slice(-5) // 只保留最近5轮对话
      .map((msg: ChatMessage) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n');

    // 3. 构建完整的提示词
    const { prompt, useJsonFormat } = getFinancialAnalysisPrompt({
      text: relevantContext,
      question,
      knowledgeDocNames
    });

    const systemPrompt = `${prompt}

相关文档内容：
${relevantContext}

对话历史：
${conversationHistory}

请回答用户的问题：`;

    // 4. 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const result = completion.choices[0]?.message?.content || "抱歉，我无法生成回答。";

    return NextResponse.json({
      success: true,
      response: result,
      message: "Financial analysis response generated successfully"
    });

  } catch (err: unknown) {
    console.error("Financial Analysis API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to analyze financial data.", details: errorMessage },
      { status: 500 }
    );
  }
}
