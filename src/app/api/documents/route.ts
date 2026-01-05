/**
 * API Route: /api/documents
 *
 * Document management endpoints (DELETE, PATCH only).
 *
 * Note: GET is handled by /api/local-documents
 * Note: POST (upload) is handled by:
 *   - /api/documents/upload-temp (user uploads)
 *   - /api/admin/upload-database-document (admin uploads)
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/database";
import {
  verifySession,
  COOKIE_NAME,
  generateRequestId,
  createErrorResponse,
  validateCsrf,
  createCsrfErrorResponse,
} from "@/lib/security";
import { deleteDocumentFiles } from "@/lib/documents/storage";
import { DocumentUpdateSchema, validateRequest } from "@/lib/validation/api-schemas";

// DELETE: Delete a document and all related data (admin only)
export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // V3.9: Validate CSRF token
    const csrfValid = await validateCsrf(req);
    if (!csrfValid) {
      return createCsrfErrorResponse();
    }

    // V3.9: Verify admin session
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

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

  } catch (error: unknown) {
    console.error("Document Delete Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

// PATCH: Update document metadata (admin only)
export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // V3.9: Validate CSRF token
    const csrfValid = await validateCsrf(req);
    if (!csrfValid) {
      return createCsrfErrorResponse();
    }

    // Verify admin session via cookie
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // V3.9: Validate request with Zod schema
    const validation = validateRequest(DocumentUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { documentId, updates } = validation.data;

    // Build update data from validated updates
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) {
      updateData.name = updates.name.trim();
    }
    if (updates.doc_type !== undefined) {
      updateData.doc_type = updates.doc_type;
    }
    if (updates.year !== undefined) {
      updateData.year = updates.year;
    }
    if (updates.period !== undefined) {
      updateData.period = updates.period;
    }

    const supabase = createServerSupabaseClient();

    // Update document
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

  } catch (error: unknown) {
    console.error("Document Update Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
