/**
 * API Request Validation Schemas
 *
 * Zod schemas for validating API request bodies with length limits
 * to prevent resource exhaustion attacks.
 */

import { z } from 'zod';

// =============================================================================
// Constants
// =============================================================================

export const VALIDATION_LIMITS = {
    MAX_QUESTION_LENGTH: 2000,
    MAX_MESSAGES_COUNT: 10,
    MAX_MESSAGE_LENGTH: 5000,
    MAX_MESSAGES_TOTAL_LENGTH: 20000,
    MAX_PASSWORD_LENGTH: 128,
    MAX_USERNAME_LENGTH: 50,
    MAX_FILENAME_LENGTH: 255,
    MAX_DOCUMENT_IDS: 10,
    MAX_BASE64_SIZE: 3 * 1024 * 1024, // 3MB in base64
} as const;

// =============================================================================
// Common Schemas
// =============================================================================

// UUID validation
/** Lowercased: ids are compared as strings against the database's lowercase form. */
const uuid = (message?: string) => z.string().uuid(message).transform(id => id.toLowerCase());
const uuidSchema = uuid('无效的文档 ID 格式');

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Login Request (V3.10)
 * POST /api/auth/login
 */
export const LoginSchema = z.object({
    username: z
        .string()
        .min(1, '用户名不能为空')
        .max(
            VALIDATION_LIMITS.MAX_USERNAME_LENGTH,
            `用户名长度不能超过 ${VALIDATION_LIMITS.MAX_USERNAME_LENGTH} 字符`
        ),
    password: z
        .string()
        .min(1, '密码不能为空')
        .max(
            VALIDATION_LIMITS.MAX_PASSWORD_LENGTH,
            `密码长度不能超过 ${VALIDATION_LIMITS.MAX_PASSWORD_LENGTH} 字符`
        ),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

/**
 * Chat Message Request (V3.9)
 * POST /api/chat and /api/chat/stream
 */
export const ChatMessageSchema = z.object({
    question: z
        .string()
        .min(1, '问题不能为空')
        .max(
            VALIDATION_LIMITS.MAX_QUESTION_LENGTH,
            `问题长度不能超过 ${VALIDATION_LIMITS.MAX_QUESTION_LENGTH} 字符`
        ),
    sessionId: uuid().optional(),
    files: z.array(z.string()).max(5, '最多上传5个文件').optional(),
    documentIds: z
        .array(uuid())
        .max(VALIDATION_LIMITS.MAX_DOCUMENT_IDS, `最多选择 ${VALIDATION_LIMITS.MAX_DOCUMENT_IDS} 个文档`)
        .optional(),
});

export type ChatMessageRequest = z.infer<typeof ChatMessageSchema>;

/**
 * GET /api/documents/preview-url
 * Only a document id: a Storage path would let the route sign any file in the bucket.
 */
export const PreviewUrlQuerySchema = z.object({
    id: uuid('无效的文档ID'),
    redirect: z.literal('1').optional(),
}).strict();

/**
 * Route param of /api/sessions/[id]
 */
export const SessionIdParamSchema = uuid('无效的会话ID');

const DOCUMENT_TYPES = [
    'balance_sheet', 'income_statement', 'cash_flow', 'financial_report', 'account_detail', 'regulation',
    'accounting_standard', 'policy', 'business_info', 'contract', 'invoice', 'voucher', 'general',
] as const;

/**
 * POST /api/admin/upload-database-document
 * `documentText` is the file's text, or its base64 bytes for a binary file.
 */
export const AdminUploadDocumentSchema = z.object({
    documentText: z.string().min(1, '文件内容不能为空'),
    fileName: z.string().min(1, '文件名不能为空').max(VALIDATION_LIMITS.MAX_FILENAME_LENGTH),
    documentType: z.enum(DOCUMENT_TYPES),
    year: z.string().max(10).optional(),
    period: z.string().max(20).optional(),
    startDate: z.string().max(20).optional(),
    endDate: z.string().max(20).optional(),
    columnMapping: z.object({ name: z.string(), periodEnd: z.string(), periodStart: z.string() }).optional(),
    adminPassword: z.string().min(1, '缺少管理员密码').max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Data Extraction Request (V3.9)
 * POST /api/quick-actions/extract
 */
export const ExtractRequestSchema = z.object({
    // Either fileData or documentId is required
    fileData: z
        .string()
        .max(VALIDATION_LIMITS.MAX_BASE64_SIZE, '文件大小超过限制')
        .optional(),
    fileType: z.string().optional(),
    fileName: z
        .string()
        .max(VALIDATION_LIMITS.MAX_FILENAME_LENGTH, '文件名过长')
        .optional(),
    documentId: uuid().optional(),
}).refine(
    (data) => data.fileData || data.documentId,
    { message: '必须提供文件数据或文档ID' }
);

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

/**
 * Temporary Document Upload Request (V3.9)
 * POST /api/documents/upload-temp
 */
export const TempUploadSchema = z.object({
    fileData: z
        .string()
        .min(1, '文件数据不能为空')
        .max(VALIDATION_LIMITS.MAX_BASE64_SIZE, '文件大小超过限制'),
    fileName: z
        .string()
        .min(1, '文件名不能为空')
        .max(VALIDATION_LIMITS.MAX_FILENAME_LENGTH, '文件名过长'),
    fileType: z.string().optional(),
    source: z.string().optional(),
});

export type TempUploadRequest = z.infer<typeof TempUploadSchema>;

/**
 * Document Update Request (V3.9)
 * PATCH /api/documents
 */
export const DocumentUpdateSchema = z.object({
    documentId: uuid('无效的文档ID'),
    updates: z.object({
        name: z
            .string()
            .min(1, '名称不能为空')
            .max(VALIDATION_LIMITS.MAX_FILENAME_LENGTH, '名称过长')
            .optional(),
        doc_type: z.string().nullable().optional(),
        year: z
            .string()
            .regex(/^\d{4}$/, '年份格式错误')
            .nullable()
            .optional(),
        period: z.string().nullable().optional(),
    }).refine(
        (updates) => Object.keys(updates).length > 0,
        { message: '至少需要更新一个字段' }
    ),
});

export type DocumentUpdateRequest = z.infer<typeof DocumentUpdateSchema>;

/**
 * Session Termination Request (V3.9)
 * DELETE /api/admin/sessions
 */
export const SessionTerminateSchema = z.object({
    sessionId: uuid('无效的会话ID'),
});

export type SessionTerminateRequest = z.infer<typeof SessionTerminateSchema>;

// =============================================================================
// Report Schemas (V4.2)
// =============================================================================

/**
 * Valid report section IDs
 */
export const ReportSectionIdSchema = z.enum([
    'liquidity',
    'solvency',
    'profitability',
    'efficiency',
    'comprehensive',
]);

export type ReportSectionIdType = z.infer<typeof ReportSectionIdSchema>;

/**
 * Report Generation Request
 * POST /api/reports/generate
 */
export const ReportGenerateSchema = z.object({
    year: z
        .string()
        .regex(/^\d{4}$/, '年份格式错误（需要4位数字）'),
    comparisonYear: z
        .string()
        .regex(/^\d{4}$/, '对比年份格式错误（需要4位数字）')
        .optional(),
    sections: z
        .array(ReportSectionIdSchema)
        .min(1, '至少选择一个分析章节')
        .optional(),
});

export type ReportGenerateRequest = z.infer<typeof ReportGenerateSchema>;

/**
 * Report Save Request
 * POST /api/reports/save
 * Note: content validation is minimal since it comes from our workflow
 */
export const ReportSaveSchema = z.object({
    content: z.object({
        title: z.string().min(1),
        generatedAt: z.string(),
        year: z.string(),
        comparisonYear: z.string().optional(),
        sections: z.array(z.any()),
        summary: z.object({
            status: z.enum(['ok', 'not_generated']).optional(),
            reason: z.string().optional(),
            keyFindings: z.array(z.string()),
            riskWarnings: z.array(z.string()),
            recommendations: z.array(z.string()),
        }),
    }),
    year: z
        .string()
        .regex(/^\d{4}$/, '年份格式错误'),
    comparisonYear: z
        .string()
        .regex(/^\d{4}$/, '对比年份格式错误')
        .optional(),
    generationTimeMs: z
        .number()
        .int()
        .nonnegative()
        .optional(),
});

export type ReportSaveRequest = z.infer<typeof ReportSaveSchema>;

/**
 * Report ID Parameter
 * GET /api/reports/[id]
 */
export const ReportIdParamSchema = z.object({
    id: uuidSchema,
});

export type ReportIdParam = z.infer<typeof ReportIdParamSchema>;

/**
 * Report Configuration Parse Request
 * POST /api/reports/parse-config
 * Used for conversational report configuration
 */
export const ReportConfigParseSchema = z.object({
    userMessage: z
        .string()
        .min(1, '消息不能为空')
        .max(500, '消息过长'),
    currentConfig: z.object({
        year: z.string().regex(/^\d{4}$/, '年份格式错误'),
        comparisonYear: z.string().regex(/^\d{4}$/).nullable(),
        sections: z.array(ReportSectionIdSchema).nullable(),
    }),
    availableYears: z.array(z.string().regex(/^\d{4}$/)),
});

export type ReportConfigParseRequest = z.infer<typeof ReportConfigParseSchema>;

/**
 * Report Configuration Parse Response Intent
 */
export const ReportConfigIntentSchema = z.object({
    intent: z.enum([
        'confirm',
        'change_year',
        'change_comparison',
        'remove_comparison',
        'change_sections',
        'cancel',
        'unclear',
    ]),
    year: z.string().nullable(),
    comparisonYear: z.string().nullable(),
    sections: z.array(ReportSectionIdSchema).nullable(),
    clarificationNeeded: z.string().nullable(),
});

export type ReportConfigIntent = z.infer<typeof ReportConfigIntentSchema>;

// =============================================================================
// Validation Helper
// =============================================================================

/**
 * Validate request data against a schema
 * Returns typed result for type-safe handling
 */
export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: string } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    // Return the first validation error message
    const firstError = result.error.issues[0];
    return { success: false, error: firstError.message };
}

/**
 * Validate request and throw on failure
 * Use in try-catch blocks
 */
export function parseRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = validateRequest(schema, data);

    if (!result.success) {
        throw new Error(result.error);
    }

    return result.data;
}
