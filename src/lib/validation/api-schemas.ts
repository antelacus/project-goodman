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
    MAX_DOCUMENT_IDS: 20,
    MAX_PASSWORD_LENGTH: 128,
    MAX_YEAR_LENGTH: 4,
} as const;

// =============================================================================
// Common Schemas
// =============================================================================

// UUID validation
const uuidSchema = z.string().uuid('无效的文档 ID 格式');

// Document IDs array
const documentIdsSchema = z
    .array(uuidSchema)
    .max(
        VALIDATION_LIMITS.MAX_DOCUMENT_IDS,
        `最多选择 ${VALIDATION_LIMITS.MAX_DOCUMENT_IDS} 个文档`
    )
    .optional();

// Chat message
const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant'], {
        errorMap: () => ({ message: '消息角色必须是 user 或 assistant' }),
    }),
    content: z
        .string()
        .max(
            VALIDATION_LIMITS.MAX_MESSAGE_LENGTH,
            `单条消息不能超过 ${VALIDATION_LIMITS.MAX_MESSAGE_LENGTH} 字符`
        ),
});

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Financial Analysis Request
 * POST /api/financial-analysis
 */
export const FinancialAnalysisRequestSchema = z.object({
    question: z
        .string()
        .min(1, '问题不能为空')
        .max(
            VALIDATION_LIMITS.MAX_QUESTION_LENGTH,
            `问题长度不能超过 ${VALIDATION_LIMITS.MAX_QUESTION_LENGTH} 字符`
        ),
    year: z
        .string()
        .regex(/^\d{4}$/, '年份格式无效')
        .optional(),
    period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'annual']).optional(),
    documentIds: documentIdsSchema,
});

export type FinancialAnalysisRequest = z.infer<typeof FinancialAnalysisRequestSchema>;

/**
 * Guidance Chat Request
 * POST /api/guidance-chat
 */
export const GuidanceChatRequestSchema = z
    .object({
        question: z
            .string()
            .min(1, '问题不能为空')
            .max(
                VALIDATION_LIMITS.MAX_QUESTION_LENGTH,
                `问题长度不能超过 ${VALIDATION_LIMITS.MAX_QUESTION_LENGTH} 字符`
            ),
        uploadedDocument: z.object({
            text: z.string().max(100000), // 100KB text limit
            fileName: z.string().max(255),
            id: z.string().optional(),
        }).optional(),
        documentIds: documentIdsSchema,
        regulationCategories: z.array(z.string().max(100)).max(10).optional(),
    });

export type GuidanceChatRequest = z.infer<typeof GuidanceChatRequestSchema>;

/**
 * Landing Chat Request
 * POST /api/landing-chat
 */
export const LandingChatRequestSchema = z.object({
    message: z
        .string()
        .min(1, '消息不能为空')
        .max(
            VALIDATION_LIMITS.MAX_QUESTION_LENGTH,
            `消息长度不能超过 ${VALIDATION_LIMITS.MAX_QUESTION_LENGTH} 字符`
        ),
    conversationHistory: z
        .array(chatMessageSchema)
        .max(
            VALIDATION_LIMITS.MAX_MESSAGES_COUNT,
            `对话历史不能超过 ${VALIDATION_LIMITS.MAX_MESSAGES_COUNT} 条`
        )
        .optional(),
});

export type LandingChatRequest = z.infer<typeof LandingChatRequestSchema>;

/**
 * Admin Password Verification Request
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
