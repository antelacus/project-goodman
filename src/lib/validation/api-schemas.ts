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
