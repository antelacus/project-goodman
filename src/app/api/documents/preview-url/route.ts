/**
 * API Route: GET /api/documents/preview-url
 *
 * Returns a signed URL for previewing a document's original file.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSignedFileUrl } from "../../../../lib/storage-helpers";
import { generateRequestId, createErrorResponse } from "../../../../lib/security/error-handler";

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('fileUrl');

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl parameter is required" },
        { status: 400 }
      );
    }

    // Get signed URL (expires in 1 hour)
    const signedUrl = await getSignedFileUrl(fileUrl);

    if (!signedUrl) {
      return NextResponse.json(
        { error: "Failed to generate signed URL" },
        { status: 500 }
      );
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
