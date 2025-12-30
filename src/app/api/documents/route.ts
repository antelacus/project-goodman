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
import { verifyAdminPassword, generateRequestId, createErrorResponse } from "@/lib/security";
import { deleteDocumentFiles } from "@/lib/documents";

// DELETE: Delete a document and all related data
export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

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

  } catch (error: unknown) {
    console.error("Document Delete Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

// PATCH: Update document metadata (admin only)
export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

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
