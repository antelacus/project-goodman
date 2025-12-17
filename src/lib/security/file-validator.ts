/**
 * File Content Validator
 * REQ-009: Magic number validation to prevent file masquerading attacks
 * 
 * @module security/file-validator
 * @description Validates file content by checking magic numbers (file signatures)
 * to ensure the actual file content matches the declared MIME type.
 */

/**
 * File signatures (magic numbers) for supported file types
 * @see https://en.wikipedia.org/wiki/List_of_file_signatures
 */
const FILE_SIGNATURES: Record<string, { magic: number[]; offset?: number }> = {
    // PDF: %PDF (0x25 0x50 0x44 0x46)
    'application/pdf': {
        magic: [0x25, 0x50, 0x44, 0x46]
    },

    // XLSX/DOCX/PPTX: ZIP archive (PK header)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        magic: [0x50, 0x4B, 0x03, 0x04],
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        magic: [0x50, 0x4B, 0x03, 0x04],
    },

    // PNG: 0x89 PNG
    'image/png': {
        magic: [0x89, 0x50, 0x4E, 0x47]
    },

    // JPEG: 0xFF 0xD8 0xFF
    'image/jpeg': {
        magic: [0xFF, 0xD8, 0xFF]
    },

    // WebP: RIFF....WEBP
    'image/webp': {
        magic: [0x52, 0x49, 0x46, 0x46],  // RIFF
    },

    // GIF: GIF87a or GIF89a
    'image/gif': {
        magic: [0x47, 0x49, 0x46, 0x38]  // GIF8
    },
};

/**
 * Text file MIME types that should be validated as UTF-8
 */
const TEXT_MIME_TYPES = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
];

/**
 * Result of file content validation
 */
export interface FileValidationResult {
    valid: boolean;
    detectedType?: string;
    error?: string;
}

/**
 * Validate file content against declared MIME type
 * 
 * @param buffer - File content as Buffer
 * @param declaredType - Declared MIME type from upload
 * @returns Validation result with detected type or error
 * 
 * @example
 * ```typescript
 * const buffer = Buffer.from(fileData, 'base64');
 * const result = validateFileContent(buffer, 'application/pdf');
 * if (!result.valid) {
 *   return NextResponse.json({ error: result.error }, { status: 400 });
 * }
 * ```
 */
export function validateFileContent(
    buffer: Buffer,
    declaredType: string
): FileValidationResult {
    // Handle empty buffer
    if (!buffer || buffer.length === 0) {
        return { valid: false, error: '文件内容为空' };
    }

    // Text files: validate UTF-8 encoding
    if (TEXT_MIME_TYPES.includes(declaredType)) {
        try {
            // Attempt to decode as UTF-8
            const text = buffer.toString('utf-8');

            // Check for invalid UTF-8 sequences (replacement character)
            if (text.includes('\uFFFD')) {
                return { valid: false, error: '文件编码无效，需要 UTF-8 编码' };
            }

            return { valid: true, detectedType: declaredType };
        } catch {
            return { valid: false, error: '文件编码无效' };
        }
    }

    // Get expected signature for declared type
    const signature = FILE_SIGNATURES[declaredType];

    // Unknown type: skip magic validation but allow
    if (!signature) {
        // For unknown types, we allow them but log a warning
        console.warn(`[FileValidator] Unknown MIME type: ${declaredType}, skipping magic validation`);
        return { valid: true, detectedType: declaredType };
    }

    // Check if buffer is large enough
    const offset = signature.offset || 0;
    if (buffer.length < offset + signature.magic.length) {
        return { valid: false, error: '文件太小，无法验证' };
    }

    // Check magic number
    const matches = signature.magic.every(
        (byte, i) => buffer[offset + i] === byte
    );

    if (!matches) {
        return {
            valid: false,
            error: '文件内容与声明类型不符'
        };
    }

    return { valid: true, detectedType: declaredType };
}

/**
 * Validate file by extension and content
 * 
 * @param buffer - File content as Buffer
 * @param fileName - Original file name with extension
 * @returns Validation result
 */
export function validateFileByExtension(
    buffer: Buffer,
    fileName: string
): FileValidationResult {
    const ext = fileName.toLowerCase().split('.').pop();

    // Map extension to MIME type
    const extensionToMime: Record<string, string> = {
        'pdf': 'application/pdf',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
        'gif': 'image/gif',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'csv': 'text/csv',
        'json': 'application/json',
    };

    const mimeType = extensionToMime[ext || ''];

    if (!mimeType) {
        // Unknown extension
        return { valid: true, detectedType: 'application/octet-stream' };
    }

    return validateFileContent(buffer, mimeType);
}

/**
 * Detect file type from buffer content (magic number detection)
 * 
 * @param buffer - File content as Buffer
 * @returns Detected MIME type or null if unknown
 */
export function detectFileType(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 4) {
        return null;
    }

    // Check each known signature
    for (const [mimeType, signature] of Object.entries(FILE_SIGNATURES)) {
        const offset = signature.offset || 0;

        if (buffer.length < offset + signature.magic.length) {
            continue;
        }

        const matches = signature.magic.every(
            (byte, i) => buffer[offset + i] === byte
        );

        if (matches) {
            return mimeType;
        }
    }

    // Check if it looks like UTF-8 text
    try {
        const sample = buffer.slice(0, Math.min(1000, buffer.length)).toString('utf-8');
        // If it decodes cleanly without replacement chars, likely text
        if (!sample.includes('\uFFFD') && /^[\x20-\x7E\r\n\t\u4e00-\u9fff\u3000-\u303f]+$/.test(sample)) {
            return 'text/plain';
        }
    } catch {
        // Not valid UTF-8
    }

    return null;
}
