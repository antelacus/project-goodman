import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse, getSession } from "@/lib/security";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // V3.10: Get session for document filtering
    const session = await getSession(req);
    const supabase = createServerSupabaseClient();

    // V3.10: Build query based on role
    // - Admin: Can see all documents
    // - Guest/User: Can see knowledge + own business documents
    // - No session: Can see only knowledge documents
    let query = supabase.from('documents').select('*');

    if (!session) {
      // No session - only knowledge documents
      query = query.eq('doc_category', 'knowledge');
    } else if (session.role === 'admin') {
      // Admin - can see all documents (no filter)
    } else {
      // Guest or User - knowledge + own business documents
      const ownerId = session.role === 'guest' ? session.sessionId : session.userId;
      query = query.or(
        `doc_category.eq.knowledge,and(owner_type.eq.${session.role},owner_id.eq.${ownerId})`
      );
    }

    const { data: documents, error: docsError } = await query
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching knowledge documents:', docsError);
      throw docsError;
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ documents: [] });
    }

    // 获取所有知识型文档的chunks
    const documentIds = documents.map(doc => doc.id);
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*')
      .in('document_id', documentIds)
      .order('chunk_index', { ascending: true });

    if (chunksError) {
      console.error('Error fetching document chunks:', chunksError);
      throw chunksError;
    }

    // 将chunks按文档分组 - using typed array
    type ChunkSummary = {
      id: string;
      text: string;
      embedding: string | null;
      chunkIndex: number;
    };
    const chunksByDocId = new Map<string, ChunkSummary[]>();
    (chunks ?? []).forEach(chunk => {
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
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      name: doc.name,
      type: doc.doc_type || "knowledge",
      docCategory: doc.doc_category,
      docType: doc.doc_type,        // Database column (source of truth)
      year: doc.year,               // Database column (source of truth)
      period: doc.period,           // Database column (source of truth)
      fileUrl: doc.file_url,        // Storage path for original file
      uploadTime: doc.upload_time,
      status: doc.status,
      size: doc.size,
      summary: doc.summary,
      chunks: chunksByDocId.get(doc.id) || [],
      // V3.10: Ownership info
      ownerType: doc.owner_type,
      expiresAt: doc.expires_at ? new Date(doc.expires_at).getTime() : null,
    }));

    return NextResponse.json({ documents: formattedDocuments });

  } catch (error: unknown) {
    console.error("Error loading documents from Supabase:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
