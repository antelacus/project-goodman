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
const uuidSchema = z.string().uuid('无效的文档 ID 格式');

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Admin Password Verification Request (Legacy)
 * POST /api/admin/verify-password
 */
export const AdminVerifyPasswordSchema = z.object({
    password: z
        .string()
        .min(1, '密码不能为空')
        .max(
            VALIDATION_LIMITS.MAX_PASSWORD_LENGTH,
            `密码长度不能超过 ${VALIDATION_LIMITS.MAX_PASSWORD_LENGTH} 字符`
        ),
});

export type AdminVerifyPasswordRequest = z.infer<typeof AdminVerifyPasswordSchema>;

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
    sessionId: z.string().uuid().optional(),
    files: z.array(z.string()).max(5, '最多上传5个文件').optional(),
    documentIds: z
        .array(z.string().uuid())
        .max(VALIDATION_LIMITS.MAX_DOCUMENT_IDS, `最多选择 ${VALIDATION_LIMITS.MAX_DOCUMENT_IDS} 个文档`)
        .optional(),
});

export type ChatMessageRequest = z.infer<typeof ChatMessageSchema>;

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
    documentId: z.string().uuid().optional(),
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
    documentId: z.string().uuid('无效的文档ID'),
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
    sessionId: z.string().uuid('无效的会话ID'),
});

export type SessionTerminateRequest = z.infer<typeof SessionTerminateSchema>;

// =============================================================================
// Report Schemas (V4.2)
// =============================================================================

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
