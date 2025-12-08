import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createServerSupabaseClient } from "../../../lib/supabase";
import { verifyAdminPassword } from "../../../lib/admin-auth";
import { deleteDocumentFiles } from "../../../lib/storage-helpers";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, documentId, documentName, docCategory = "business", docType } = body;

    if (!text || !documentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // 1. 文本分块处理
    const chunks = splitTextIntoChunks(text, 1000); // 每块1000字符

    // 2. 为每个文本块生成Embedding
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResponse = await openai.embeddings.create({
        model: "gpt-5-mini",
        input: chunk,
        encoding_format: "float",
      });
      embeddings.push({
        id: `${documentId}-chunk-${i}`,
        document_id: documentId,
        chunk_index: i,
        content: chunk,
        embedding: embeddingResponse.data[0].embedding,
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
      model: "gpt-5-mini",
      messages: [{ role: "user", content: summaryPrompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const summary = JSON.parse(summaryResponse.choices[0]?.message?.content || "{}");

    // 4. 保存到Supabase数据库
    // First, insert the document metadata
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        name: documentName || documentId,
        doc_category: docCategory,
        doc_type: docType || 'txt',
        status: 'ready',
        size: Buffer.byteLength(text, 'utf-8'),
        summary,
      } as any);

    if (docError) {
      // If document already exists, update it
      if (docError.code === '23505') {
        const { error: updateError } = await supabase
          .from('documents')
          // @ts-ignore - Supabase type inference issue
          .update({
            name: documentName || documentId,
            size: Buffer.byteLength(text, 'utf-8'),
            summary,
            upload_time: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) {
          throw updateError;
        }

        // Delete existing chunks
        const { error: deleteError } = await supabase
          .from('document_chunks')
          .delete()
          .eq('document_id', documentId);

        if (deleteError) {
          throw deleteError;
        }
      } else {
        throw docError;
      }
    }

    // Insert chunks in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < embeddings.length; i += BATCH_SIZE) {
      const batch = embeddings.slice(i, i + BATCH_SIZE);
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(batch as any);

      if (chunksError) {
        throw chunksError;
      }
    }

    // 返回结果（包含简化的chunks信息，不包含embeddings）
    return NextResponse.json({
      success: true,
      documentId,
      summary,
      chunks: embeddings.map(({ id, content, chunk_index }) => ({
        id,
        text: content,
        chunkIndex: chunk_index
      })),
      message: "文档处理完成并已保存到数据库"
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

// GET方法：从Supabase获取文档列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docCategory = searchParams.get('category');
    const docTypes = searchParams.get('type'); // comma-separated types

    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('documents')
      .select('id, name, doc_category, doc_type, upload_time, status, size, summary, year, period, is_structured, file_url')
      .order('upload_time', { ascending: false });

    if (docCategory) {
      query = query.eq('doc_category', docCategory);
    }

    if (docTypes) {
      const types = docTypes.split(',').map(t => t.trim());
      query = query.in('doc_type', types);
    }

    const { data: documents, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });

  } catch (err: unknown) {
    console.error("Document Fetch Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to fetch documents", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE方法：删除文档
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Delete files from storage (non-fatal if fails)
    try {
      await deleteDocumentFiles(documentId);
    } catch (storageError) {
      console.error("Storage delete error (non-fatal):", storageError);
    }

    // Delete related data explicitly to ensure cleanup (even if DB CASCADE is missing)
    await Promise.all([
      supabase.from('financial_data').delete().eq('document_id', documentId),
      supabase.from('structured_regulations').delete().eq('document_id', documentId),
      supabase.from('document_chunks').delete().eq('document_id', documentId)
    ]);

    // Delete document
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });

  } catch (err: unknown) {
    console.error("Document Delete Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to delete document", details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH方法：更新文档属性（管理员）
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, adminPassword, updates } = body;

    // Validate required fields
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin password is required" },
        { status: 400 }
      );
    }

    // Verify admin password
    const isValidPassword = await verifyAdminPassword(adminPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 401 }
      );
    }

    // Validate updates object
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: "Updates object is required" },
        { status: 400 }
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = ['name', 'doc_type', 'year', 'period'];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        // Validate field values
        if (field === 'name' && updates.name) {
          if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
            return NextResponse.json(
              { error: "Name must be a non-empty string" },
              { status: 400 }
            );
          }
          updateData.name = updates.name.trim();
        } else if (field === 'doc_type') {
          // Allow null or valid string
          updateData.doc_type = updates.doc_type || null;
        } else if (field === 'year') {
          // Validate year format (4 digits or null)
          if (updates.year && !/^\d{4}$/.test(updates.year)) {
            return NextResponse.json(
              { error: "Year must be a 4-digit string (e.g., '2024')" },
              { status: 400 }
            );
          }
          updateData.year = updates.year || null;
        } else if (field === 'period') {
          // Allow null or valid string
          updateData.period = updates.period || null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Update document using raw query to avoid type issues
    const { data, error } = await (supabase
      .from('documents') as any)
      .update(updateData)
      .eq('id', documentId)
      .select('id, name, doc_type, year, period')
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
      document: data
    });

  } catch (err: unknown) {
    console.error("Document Update Error:", err);
    const errorMessage = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: "Failed to update document", details: errorMessage },
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
