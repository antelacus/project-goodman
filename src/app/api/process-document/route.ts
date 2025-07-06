import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, documentId, fileName } = body;

    if (!text || !documentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. 文本分块处理
    const chunks = splitTextIntoChunks(text, 1000); // 每块1000字符

    // 2. 为每个文本块生成Embedding
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float",
      });
      embeddings.push({
        id: `${documentId}-chunk-${i}`,
        text: chunk,
        embedding: embeddingResponse.data[0].embedding,
        chunkIndex: i
      });
    }

    // 3. 生成文档摘要
    const summaryPrompt = `
      请为以下财务文档生成一个简洁的摘要，包含：
      1. 文档类型
      2. 主要财务数据
      3. 关键指标
      4. 时间范围

      文档内容：
      ${text.substring(0, 2000)}...

      请以JSON格式返回：
      {
        "document_type": "文档类型",
        "summary": "文档摘要",
        "key_metrics": ["关键指标1", "关键指标2"],
        "time_period": "时间范围",
        "total_chunks": ${chunks.length}
      }
    `;

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: summaryPrompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const summary = JSON.parse(summaryResponse.choices[0]?.message?.content || "{}");

    // 直接返回结果
    return NextResponse.json({
      success: true,
      documentId,
      summary,
      chunks: embeddings.map(({ id, text, chunkIndex }) => ({ id, text, chunkIndex })),
      message: "文档处理完成"
    });

  } catch (err: unknown) {
    console.error("Document Processing Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to process document", details: errorMessage },
      { status: 500 }
    );
  }
}

// 文本分块函数
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";
  // 按句子分割
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + "。";
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

// GET方法已移除，因为文档不再存储在服务器端 