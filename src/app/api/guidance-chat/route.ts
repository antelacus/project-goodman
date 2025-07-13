export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getGuidanceChatPrompt } from "../../../lib/prompts";
import fs from "fs";
import path from "path";

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

// 加载本地知识型文档
function loadLocalKnowledgeDocuments(): Record<string, Document> {
  try {
    const documentsDir = path.join(process.cwd(), "data", "documents");
    if (!fs.existsSync(documentsDir)) {
      return {};
    }

    const files = fs.readdirSync(documentsDir).filter(file => file.endsWith('.json'));
    const documents: Record<string, Document> = {};

    for (const file of files) {
      try {
        const filePath = path.join(documentsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        // 检查是否是chunks数组格式
        if (Array.isArray(data) && data.length > 0 && data[0].content && data[0].embedding) {
          // 这是chunks格式，需要组织成文档
          const chunksByDocument = new Map();
          
          // 按document_id分组chunks
          data.forEach((chunk: { document_id: string; chunk_index: number; content: string; embedding: number[] }) => {
            const docId = chunk.document_id || `doc-${data.indexOf(chunk)}`;
            // 使用文件名作为文档名，去掉.json后缀
            const docName = file.replace('.json', '');
            
            if (!chunksByDocument.has(docId)) {
              chunksByDocument.set(docId, {
                id: docId,
                name: docName,
                type: "knowledge",
                docCategory: "knowledge",
                uploadTime: new Date().toISOString(),
                status: "ready",
                size: Buffer.byteLength(fileContent, 'utf8'),
                chunks: []
              });
            }
            
            chunksByDocument.get(docId).chunks.push({
              id: `chunk-${docId}-${chunk.chunk_index || data.indexOf(chunk)}`,
              text: chunk.content,
              embedding: chunk.embedding,
              chunkIndex: chunk.chunk_index || data.indexOf(chunk)
            });
          });
          
          // 将分组后的文档添加到结果中
          chunksByDocument.forEach((doc) => {
            // 生成基于内容的摘要
            const allText = doc.chunks.map((chunk: { text: string }) => chunk.text).join(' ');
            const summary = {
              document_type: "知识型文档",
              summary: allText.substring(0, 300) + (allText.length > 300 ? "..." : ""),
              key_metrics: ["内容分析", "知识提取", "信息检索"],
              time_period: "当前版本"
            };
            
            doc.summary = summary;
            documents[doc.id] = doc;
          });
        } else if (data.id && data.name && data.chunks) {
          // 这是完整的文档格式
          documents[data.id] = {
            ...data,
            type: data.type || "knowledge",
            docCategory: data.docCategory || "knowledge"
          };
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    return documents;
  } catch (error) {
    console.error("Error loading local knowledge documents:", error);
    return {};
  }
}

// 简单的相似度计算（余弦相似度）
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

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

    // 1. 获取相关文档内容
    let relevantContext = "";
    
    // 处理知识型文档（从本地加载的）
    if (documentIds.length > 0) {
      const localKnowledgeDocs = loadLocalKnowledgeDocuments();
      
      // 为问题生成embedding
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
        encoding_format: "float",
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 对每个选中的知识型文档进行向量搜索
      for (const docId of documentIds) {
        const doc = localKnowledgeDocs[docId];
        if (doc && doc.chunks) {
          // 计算每个chunk与问题的相似度
          const chunkScores = doc.chunks.map(chunk => ({
            chunk,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
          }));

          // 按相似度排序，取前3个最相关的chunk
          const topChunks = chunkScores
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(item => item.chunk);

          if (topChunks.length > 0) {
            relevantContext += `\n知识文档: ${doc.name}\n`;
            relevantContext += `类型: ${doc.summary?.document_type || '未知'}\n`;
            relevantContext += `相关内容: ${topChunks.map(chunk => chunk.text).join(" ")}\n`;
          }
        }
      }
    }

    // 处理业务型文档（用户上传的）
    if (businessDocuments && businessDocuments.length > 0) {
      businessDocuments.forEach((doc: Document) => {
        relevantContext += `\n业务文档: ${doc.name}\n`;
        relevantContext += `类型: ${doc.summary?.document_type || '未知'}\n`;
        relevantContext += `内容: ${doc.chunks?.map(chunk => chunk.text).join(" ") || '无内容'}\n`;
      });
    }

    // 如果没有指定文档，使用所有本地知识型文档
    if (documentIds.length === 0 && (!businessDocuments || businessDocuments.length === 0)) {
      const localKnowledgeDocs = loadLocalKnowledgeDocuments();
      Object.values(localKnowledgeDocs).forEach((doc: Document) => {
        relevantContext += `\n知识文档: ${doc.name}\n`;
        relevantContext += `类型: ${doc.summary?.document_type || '未知'}\n`;
        relevantContext += `内容: ${doc.chunks?.slice(0, 2).map(chunk => chunk.text).join(" ") || '无内容'}\n`;
      });
    }

    // 2. 构建对话上下文
    const conversationHistory = chatHistory
      .slice(-5) // 只保留最近5轮对话
      .map((msg: ChatMessage) => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n');

    // 3. 构建完整的提示词
    const selectedKnowledgeDocNames = documentIds.map(id => {
      const localKnowledgeDocs = loadLocalKnowledgeDocuments();
      return localKnowledgeDocs[id]?.name || "";
    }).filter(Boolean);
    
    const selectedBusinessDocNames = businessDocuments?.map(doc => doc.name) || [];
    
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
    return NextResponse.json(
      { error: "Failed to generate chat response" },
      { status: 500 }
    );
  }
} 