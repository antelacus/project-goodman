export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin, TABLES } from "../../../lib/supabase";

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

// 模拟预设文档数据
const presetDocuments: Record<string, Document> = {
  "preset-1": {
    id: "preset-1",
    name: "2024年第一季度财务报表.pdf",
    summary: {
      document_type: "财务报表",
      summary: "2024年第一季度财务数据，包含收入、成本、利润等关键指标",
      key_metrics: ["营业收入", "净利润", "毛利率", "现金流"],
      time_period: "2024年第一季度"
    },
    chunks: [
      {
        id: "preset-1-chunk-0",
        text: "2024年第一季度财务报表显示，公司营业收入达到500万元，同比增长15%。净利润为80万元，毛利率维持在25%的水平。",
        embedding: [],
        chunkIndex: 0
      },
      {
        id: "preset-1-chunk-1", 
        text: "现金流状况良好，经营活动现金流净额为120万元，投资活动现金流为-50万元，筹资活动现金流为-20万元。",
        embedding: [],
        chunkIndex: 1
      }
    ]
  },
  "preset-2": {
    id: "preset-2",
    name: "2023年年度资产负债表.xlsx", 
    summary: {
      document_type: "资产负债表",
      summary: "2023年年度资产负债表，显示公司资产、负债和所有者权益状况",
      key_metrics: ["总资产", "总负债", "所有者权益", "资产负债率"],
      time_period: "2023年年度"
    },
    chunks: [
      {
        id: "preset-2-chunk-0",
        text: "2023年总资产为2000万元，其中流动资产1200万元，非流动资产800万元。总负债为800万元，资产负债率为40%。",
        embedding: [],
        chunkIndex: 0
      },
      {
        id: "preset-2-chunk-1",
        text: "所有者权益为1200万元，其中实收资本800万元，资本公积200万元，盈余公积100万元，未分配利润100万元。",
        embedding: [],
        chunkIndex: 1
      }
    ]
  },
  "preset-3": {
    id: "preset-3", 
    name: "应收账款账龄分析表.xlsx",
    summary: {
      document_type: "账龄分析表",
      summary: "应收账款账龄分析，显示不同账龄段的应收账款分布",
      key_metrics: ["应收账款总额", "30天内", "30-90天", "90天以上"],
      time_period: "2024年1月"
    },
    chunks: [
      {
        id: "preset-3-chunk-0",
        text: "应收账款总额为300万元，其中30天内的应收账款为200万元，占比67%。30-90天的应收账款为60万元，占比20%。",
        embedding: [],
        chunkIndex: 0
      },
      {
        id: "preset-3-chunk-1",
        text: "90天以上的应收账款为40万元，占比13%，需要重点关注催收工作。",
        embedding: [],
        chunkIndex: 1
      }
    ]
  }
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

    // 1. 获取相关文档内容
    let relevantContext = "";
    
    if (documentIds.length > 0) {
      // 使用指定的文档进行向量搜索
      try {
        // 为问题生成embedding
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: question,
          encoding_format: "float",
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 从Supabase进行向量搜索
        const { data: chunks, error: searchError } = await supabaseAdmin
          .from(TABLES.DOCUMENT_CHUNKS)
          .select(`
            *,
            documents (
              id,
              name,
              type,
              doc_category
            )
          `)
          .in('document_id', documentIds)
          .order(`embedding <-> '[${queryEmbedding.join(',')}]'`, { ascending: true })
          .limit(10);

        if (searchError) {
          console.error('Vector search error:', searchError);
        } else if (chunks && chunks.length > 0) {
          // 按文档分组
          const docGroups = new Map();
          chunks.forEach((chunk: any) => {
            const docId = chunk.document_id;
            if (!docGroups.has(docId)) {
              docGroups.set(docId, {
                name: chunk.documents.name,
                type: chunk.documents.type,
                category: chunk.documents.doc_category,
                chunks: []
              });
            }
            docGroups.get(docId).chunks.push(chunk.text);
          });

          // 构建上下文
          docGroups.forEach((doc: any, docId: string) => {
            relevantContext += `\n文档: ${doc.name}\n`;
            relevantContext += `类型: ${doc.type}\n`;
            relevantContext += `分类: ${doc.category}\n`;
            relevantContext += `内容: ${doc.chunks.join(" ")}\n`;
          });
        }
      } catch (error) {
        console.error('Error in vector search:', error);
      }
    } else {
      // 使用所有预设文档
      Object.values(presetDocuments).forEach((doc: Document) => {
        relevantContext += `\n文档: ${doc.name}\n`;
        relevantContext += `类型: ${doc.summary.document_type}\n`;
        relevantContext += `内容: ${doc.chunks.map((chunk: DocumentChunk) => chunk.text).join(" ")}\n`;
      });
    }

    // 2. 构建对话上下文
    const conversationHistory = chatHistory
      .slice(-5) // 只保留最近5轮对话
      .map((msg: ChatMessage) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n');

    // 3. 构建AI提示
    const prompt = `
你是一个专业的财务AI助手。基于以下财务文档信息，回答用户的问题。

可用文档信息：
${relevantContext}

${conversationHistory ? `对话历史：\n${conversationHistory}\n` : ''}

用户问题：${question}

请提供准确、专业的回答。如果信息不足，请说明需要哪些额外信息。
回答要简洁明了，重点突出，并尽可能提供具体的数字和指标。
`;

    // 4. 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("AI response is empty");
    }

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (err: unknown) {
    console.error("Chat API Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to process chat request", details: errorMessage },
      { status: 500 }
    );
  }
} 