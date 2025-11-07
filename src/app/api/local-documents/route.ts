import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // 获取所有知识型文档
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('doc_category', 'knowledge')
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching knowledge documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // 获取所有知识型文档的chunks
    const documentIds = (documents as any[]).map(doc => doc.id);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
      throw chunksError;
    }

    // 将chunks按文档分组
    const chunksByDocId = new Map<string, any[]>();
    ((chunks || []) as any[]).forEach(chunk => {
      if (!chunksByDocId.has(chunk.document_id)) {
        chunksByDocId.set(chunk.document_id, []);
      }
      chunksByDocId.get(chunk.document_id)!.push({
        id: chunk.id,
        text: chunk.content,
        embedding: chunk.embedding,
        chunkIndex: chunk.chunk_index,
      });
    });

    // 组合文档和chunks
    const formattedDocuments = (documents as any[]).map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.doc_type || "knowledge",
      docCategory: doc.doc_category,
      uploadTime: doc.upload_time,
      status: doc.status,
      size: doc.size,
      summary: doc.summary,
      chunks: chunksByDocId.get(doc.id) || [],
    }));

    return NextResponse.json({ documents: formattedDocuments });

  } catch (error) {
    console.error("Error loading documents from Supabase:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load documents", details: errorMessage },
      { status: 500 }
    );
  }
}
