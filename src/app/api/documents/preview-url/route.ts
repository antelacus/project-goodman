/**
 * API Route: GET /api/documents/preview-url
 *
 * Returns a signed URL for previewing a document's original file.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSignedFileUrl } from "@/lib/documents/storage";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse } from "@/lib/security";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');
    const documentId = searchParams.get('id');
    const shouldRedirect = searchParams.get('redirect') === '1';

    let resolvedFileUrl = fileUrl;
    if (!resolvedFileUrl && documentId) {
      const supabase = createServerSupabaseClient();
      const { data: doc, error } = await supabase
        .from("documents")
        .select("file_url")
        .eq("id", documentId)
        .single();

      if (error || !doc?.file_url) {
        return NextResponse.json(
          { error: "Document not found or has no file" },
          { status: 404 }
        );
      }

      resolvedFileUrl = doc.file_url;
    }

    if (!resolvedFileUrl) {
      return NextResponse.json(
        { error: "fileUrl or id parameter is required" },
        { status: 400 }
      );
    }

    const isAbsoluteUrl = /^https?:\/\//i.test(resolvedFileUrl);
    const signedUrl = isAbsoluteUrl ? resolvedFileUrl : await getSignedFileUrl(resolvedFileUrl);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    if (shouldRedirect) {
      return NextResponse.redirect(signedUrl);
    }

    return NextResponse.json({
      success: true,
      signedUrl,
    });

  } catch (error: unknown) {
    console.error("Preview URL Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
