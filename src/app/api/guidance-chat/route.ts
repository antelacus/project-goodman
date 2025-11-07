export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getGuidanceChatPrompt } from "../../../lib/prompts";
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

type DocumentChunk = {
  id: string;
  text: string;
  embedding: number[];
  chunkIndex: number;
};

type DocumentSummary = {
  document_type: string;
  summary: string;
  key_metrics: string[];
  time_period: string;
};

type Document = {
  id: string;
  name: string;
  summary: DocumentSummary;
  chunks: DocumentChunk[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, documentIds = [], chatHistory = [], businessDocuments = [] }: {
      question: string;
      documentIds: string[];
      chatHistory: ChatMessage[];
      businessDocuments?: Document[];
    } = body;

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // 1. 获取相关文档内容
    let relevantContext = "";

    // 为问题生成embedding（用于知识型文档的向量搜索）
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
      encoding_format: "float",
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 处理知识型文档（从Supabase加载并进行向量搜索）
    let selectedKnowledgeDocNames: string[] = [];

    if (documentIds.length > 0) {
      // 使用Supabase的向量搜索功能
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
        // 获取文档信息
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select('id, name, summary')
          .in('id', documentIds);

        if (docsError) {
          console.error('Error fetching documents:', docsError);
        }

        // 创建文档ID到名称和摘要的映射
        const docIdToName = new Map(
          ((documents || []) as any[]).map(doc => [doc.id, doc.name])
        );
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
          selectedKnowledgeDocNames.push(docName);

          relevantContext += `\n知识文档: ${docName}\n`;
          relevantContext += `类型: ${summary?.document_type || '未知'}\n`;
          relevantContext += `相关内容: ${chunks.map(chunk => chunk.content).join(" ")}\n`;
        }
      }
    }

    // 处理业务型文档（用户上传的）
    let selectedBusinessDocNames: string[] = [];

    if (businessDocuments && businessDocuments.length > 0) {
      businessDocuments.forEach((doc: Document) => {
        selectedBusinessDocNames.push(doc.name);
        relevantContext += `\n业务文档: ${doc.name}\n`;
        relevantContext += `类型: ${doc.summary?.document_type || '未知'}\n`;
        relevantContext += `内容: ${doc.chunks?.map(chunk => chunk.text).join(" ") || '无内容'}\n`;
      });
    }

    // 如果没有指定任何文档，加载所有知识型文档的概要
    if (documentIds.length === 0 && (!businessDocuments || businessDocuments.length === 0)) {
      const { data: allKnowledgeDocs, error: allDocsError } = await supabase
        .from('documents')
        .select('id, name, summary')
        .eq('doc_category', 'knowledge')
        .limit(10);

      if (allDocsError) {
        console.error('Error fetching all knowledge documents:', allDocsError);
      } else if (allKnowledgeDocs && (allKnowledgeDocs as any[]).length > 0) {
        for (const doc of (allKnowledgeDocs as any[])) {
          selectedKnowledgeDocNames.push(doc.name);
          relevantContext += `\n知识文档: ${doc.name}\n`;
          const summary = doc.summary as any;
          relevantContext += `类型: ${summary?.document_type || '未知'}\n`;
          relevantContext += `摘要: ${summary?.summary || '无摘要'}\n`;
        }
      }
    }

    // 2. 构建对话上下文
    const conversationHistory = chatHistory
      .slice(-5) // 只保留最近5轮对话
      .map((msg: ChatMessage) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n');

    // 3. 构建完整的提示词
    const basePrompt = getGuidanceChatPrompt(selectedKnowledgeDocNames, selectedBusinessDocNames);

    const systemPrompt = `${basePrompt}

相关文档内容：
${relevantContext}

对话历史：
${conversationHistory}

用户问题：${question}

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

    const response = completion.choices[0]?.message?.content || "抱歉，我无法生成回答。";

    return NextResponse.json({
      success: true,
      response,
      message: "Chat response generated successfully"
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate chat response", details: errorMessage },
      { status: 500 }
    );
  }
}
