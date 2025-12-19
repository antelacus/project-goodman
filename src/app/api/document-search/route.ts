
import { NextRequest, NextResponse } from "next/server";
import { validateRequest, DocumentSearchRequestSchema } from "@/lib/validation/api-schemas";
import { selectDocumentsForQuery } from "@/lib/document-selector";
import { generateRequestId, createErrorResponse } from "@/lib/security/error-handler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    try {
        const body = await request.json();
        const validation = validateRequest(DocumentSearchRequestSchema, body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error, requestId },
                { status: 400, headers: { 'X-Request-ID': requestId } }
            );
        }

        const { query, options } = validation.data;

        // Execute intelligent document selection
        const result = await selectDocumentsForQuery(query, {
            maxDocuments: options?.limit
        });

        return NextResponse.json(result);

    } catch (error: unknown) {
        console.error('Document Search API error:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
