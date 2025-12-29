/**
 * Rate Limiter with Sliding Window Algorithm
 *
 * Provides rate limiting using in-memory storage to prevent
 * API abuse and control request rates per endpoint category.
 * 
 * Note: Uses in-memory Map for Edge Runtime compatibility in middleware.
 * For distributed deployments, rate limiting should be moved to API routes
 * with Redis storage.
 */

// In-memory storage for rate limiting (Edge Runtime compatible)
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

// =============================================================================
// Types
// =============================================================================

export interface RateLimitConfig {
    windowMs: number;     // Window size in milliseconds
    maxRequests: number;  // Max requests per window
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;    // Remaining requests in window
    limit: number;        // Max requests for this endpoint
    resetAt: number;      // Window reset timestamp (Unix seconds)
}

// =============================================================================
// Configuration
// =============================================================================

// Rate limits by endpoint category
const RATE_LIMITS: Record<string, RateLimitConfig> = {
    ai: { windowMs: 60000, maxRequests: 20 },       // AI endpoints: 20/min
    data: { windowMs: 60000, maxRequests: 60 },     // Data endpoints: 60/min
    auth: { windowMs: 60000, maxRequests: 5 },      // Auth endpoints: 5/min
    default: { windowMs: 60000, maxRequests: 100 }, // Default: 100/min
};

// Endpoint to category mapping
const ENDPOINT_CATEGORIES: Record<string, string> = {
    // AI-intensive endpoints (expensive OpenAI calls)
    '/api/chat': 'ai',
    '/api/quick-actions/extract': 'ai',

    // Authentication endpoints (strict limits)
    '/api/admin/verify-password': 'auth',

    // Data endpoints (moderate limits)
    '/api/documents': 'data',
    '/api/local-documents': 'data',
};

// IPs that bypass rate limiting
const WHITELIST_IPS = new Set([
    '127.0.0.1',
    '::1',
    'localhost',
]);

// Paths that bypass rate limiting
const WHITELIST_PATHS = new Set([
    '/api/health',
    '/_next',
    '/favicon.ico',
]);

// Redis key prefix
const RATE_LIMIT_KEY_PREFIX = 'rate:';

// =============================================================================
// Rate Limiter Functions
// =============================================================================

/**
 * Get the category for an endpoint
 */
function getEndpointCategory(pathname: string): string {
    // Check exact match first
    if (ENDPOINT_CATEGORIES[pathname]) {
        return ENDPOINT_CATEGORIES[pathname];
    }

    // Check prefix match for dynamic routes
    for (const [path, category] of Object.entries(ENDPOINT_CATEGORIES)) {
        if (pathname.startsWith(path)) {
            return category;
        }
    }

    return 'default';
}

/**
 * Check if request should bypass rate limiting
 */
export function shouldBypassRateLimit(ip: string, pathname: string): boolean {
    // Whitelist IPs
    if (WHITELIST_IPS.has(ip)) {
        return true;
    }

    // Whitelist paths
    for (const path of WHITELIST_PATHS) {
        if (pathname.startsWith(path)) {
            return true;
        }
    }

    return false;
}

/**
 * Check rate limit for an IP and endpoint
 * Uses sliding window algorithm with in-memory storage
 */
export async function checkRateLimit(
    ip: string,
    pathname: string
): Promise<RateLimitResult> {
    // Get config for this endpoint category
    const category = getEndpointCategory(pathname);
    const config = RATE_LIMITS[category] || RATE_LIMITS.default;

    // Build storage key
    const key = `${RATE_LIMIT_KEY_PREFIX}${category}:${ip}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
        // Get current state from memory
        let state = rateLimitStore.get(key);

        if (state) {
            // Check if window has expired
            if (state.windowStart < windowStart) {
                // Reset for new window
                state = { count: 0, windowStart: now };
            }
        } else {
            // New window
            state = { count: 0, windowStart: now };
        }

        // Calculate window reset time
        const windowEndMs = state.windowStart + config.windowMs;
        const resetAt = Math.ceil(windowEndMs / 1000);

        // Check if limit exceeded
        if (state.count >= config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                limit: config.maxRequests,
                resetAt,
            };
        }

        // Increment count
        state.count += 1;
        const remaining = Math.max(0, config.maxRequests - state.count);

        // Save updated state
        rateLimitStore.set(key, state);

        // Clean up old entries periodically (every 100 requests approx)
        if (Math.random() < 0.01) {
            cleanupExpiredEntries();
        }

        return {
            allowed: true,
            remaining,
            limit: config.maxRequests,
            resetAt,
        };
    } catch (error) {
        // On error, allow request but log warning
        console.error('[RateLimiter] Error checking rate limit:', error);
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            limit: config.maxRequests,
            resetAt: Math.ceil((now + config.windowMs) / 1000),
        };
    }
}

/**
 * Clean up expired entries from the in-memory store
 */
function cleanupExpiredEntries(): void {
    const now = Date.now();
    const maxAge = 2 * 60 * 1000; // 2 minutes max age

    for (const [key, state] of rateLimitStore.entries()) {
        if (now - state.windowStart > maxAge) {
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
    };
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { RATE_LIMITS, ENDPOINT_CATEGORIES };
