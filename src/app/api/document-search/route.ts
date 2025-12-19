
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { searchDocuments } from '@/lib/document-search';

// Input validation schema
const requestSchema = z.object({
    query: z.string().min(1).max(500),
    filters: z.object({
        year: z.number().optional(),
        docTypes: z.array(z.string()).optional(),
        sections: z.array(z.string()).optional(),
    }).optional(),
    options: z.object({
        limit: z.number().min(1).max(50).default(10),
        includeContent: z.boolean().default(true),
        threshold: z.number().min(0).max(100).default(50), // Changed default to 50 (0-100 scale)
    }).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
            }, { status: 400 });
        }

        const { query, filters, options } = parsed.data;

        // Call the search logic
        const results = await searchDocuments(query, filters, options);

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error('Document search API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
