import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// 定义chunk的类型
interface DocumentChunk {
  content: string;
  embedding: number[];
  document_id?: string;
  document_name?: string;
  chunk_index?: number;
}

export async function GET(req: NextRequest) {
  try {
    const documentsDir = path.join(process.cwd(), "data", "documents");
    
    // 检查目录是否存在
    if (!fs.existsSync(documentsDir)) {
      return NextResponse.json({ documents: [] });
    }

    // 读取目录中的所有JSON文件
    const files = fs.readdirSync(documentsDir).filter(file => file.endsWith('.json'));
    const documents = [];

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
          data.forEach((chunk: any, index) => {
            const docId = chunk.document_id || `doc-${index}`;
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
              id: `chunk-${docId}-${chunk.chunk_index || index}`,
              text: chunk.content,
              embedding: chunk.embedding,
              chunkIndex: chunk.chunk_index || index
            });
          });
          
          // 将分组后的文档添加到结果中
          chunksByDocument.forEach((doc) => {
            // 生成基于内容的摘要
            const allText = doc.chunks.map(chunk => chunk.text).join(' ');
            const summary = {
              document_type: "知识型文档",
              summary: allText.substring(0, 300) + (allText.length > 300 ? "..." : ""),
              key_metrics: ["内容分析", "知识提取", "信息检索"],
              time_period: "当前版本"
            };
            
            doc.summary = summary;
            documents.push(doc);
          });
        } else if (data.id && data.name) {
          // 这是完整的文档格式
          documents.push({
            ...data,
            type: data.type || "knowledge",
            docCategory: data.docCategory || "knowledge",
            uploadTime: data.uploadTime || new Date().toISOString(),
            status: "ready",
            size: Buffer.byteLength(fileContent, 'utf8')
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error loading local documents:", error);
    return NextResponse.json(
      { error: "Failed to load local documents" },
      { status: 500 }
    );
  }
} 