/**
 * API Route: GET /api/documents/preview-url?id=<document id>[&redirect=1]
 *
 * A signed URL for a document's original file, for library documents and the
 * requester's own uploads (public-readiness REQ §5.7). Anyone else's document is
 * a 404, the same as a missing one.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSignedFileUrl } from "@/lib/documents/storage";
import { isReadableBy, requesterOf } from "@/lib/documents/access";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse, verifySession, COOKIE_NAME } from "@/lib/security";
import { PreviewUrlQuerySchema, validateRequest } from "@/lib/validation/api-schemas";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const query = validateRequest(PreviewUrlQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
    if (!query.success) {
      return NextResponse.json({ success: false, error: query.error }, { status: 400 });
    }

    // Read the session without creating one: no session reads library documents only.
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    const requester = session ? requesterOf(session) : {};

    const supabase = createServerSupabaseClient();
    const { data: doc } = await supabase
      .from("documents")
      .select("file_url, doc_category, owner_type, owner_id")
      .eq("id", query.data.id)
      .maybeSingle();

    if (!doc?.file_url || !isReadableBy(doc, requester)) {
      return NextResponse.json({ success: false, error: "Document not found or has no file" }, { status: 404 });
    }

    const signedUrl = /^https?:\/\//i.test(doc.file_url) ? doc.file_url : await getSignedFileUrl(doc.file_url);
    if (!signedUrl) {
      return NextResponse.json({ success: false, error: "Failed to generate signed URL" }, { status: 500 });
    }

    if (query.data.redirect === '1') {
      return NextResponse.redirect(signedUrl);
    }
    return NextResponse.json({ success: true, signedUrl });
  } catch (error: unknown) {
    console.error("Preview URL Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
