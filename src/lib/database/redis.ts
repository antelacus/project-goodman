/**
 * Redis Client with Memory Fallback
 *
 * Provides Redis operations with automatic fallback to in-memory cache
 * when Redis is unavailable. Used for rate limiting, sessions, and security features.
 */

import Redis from 'ioredis';

// =============================================================================
// Types
// =============================================================================

interface CacheEntry {
    value: string;
    expiry: number; // Unix timestamp in ms, 0 = no expiry
}

// =============================================================================
// Configuration
// =============================================================================

// Returns config at call time (allows dotenv to load first)
function getRedisConfig() {
    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
            if (times > 3) return null; // Stop retrying after 3 attempts
            return Math.min(times * 100, 1000); // Exponential backoff
        },
        lazyConnect: true, // Don't connect immediately
    };
}

// =============================================================================
// Redis Client with Fallback
// =============================================================================

class RedisWithFallback {
    private redis: Redis | null = null;
    private memoryCache: Map<string, CacheEntry> = new Map();
    private isRedisAvailable = false;
    private lastHealthCheck = 0;
    private healthCheckInterval = 30000; // 30 seconds

    constructor() {
        this.initializeRedis();
    }

    private initializeRedis(): void {
        // Skip Redis in test environment or when explicitly disabled
        if (process.env.REDIS_DISABLED === 'true') {
            console.log('[Redis] Disabled via REDIS_DISABLED env var, using memory fallback');
            return;
        }

        try {
            this.redis = new Redis(getRedisConfig());

            this.redis.on('connect', () => {
                this.isRedisAvailable = true;
                console.log('[Redis] Connected successfully');
            });

            this.redis.on('error', (err) => {
                this.isRedisAvailable = false;
                console.error('[Redis] Connection error:', err.message);
            });

            this.redis.on('close', () => {
                this.isRedisAvailable = false;
                console.log('[Redis] Connection closed');
            });

            // Attempt initial connection
            this.redis.connect().catch((err) => {
                console.error('[Redis] Initial connection failed:', err.message);
                this.isRedisAvailable = false;
            });
        } catch (err) {
            console.error('[Redis] Initialization failed:', err);
            this.redis = null;
        }
    }

    // ---------------------------------------------------------------------------
    // Health Check
    // ---------------------------------------------------------------------------

    async ping(): Promise<boolean> {
        // Use cached health status if checked recently
        const now = Date.now();
        if (now - this.lastHealthCheck < this.healthCheckInterval) {
            return this.isRedisAvailable;
        }

        if (!this.redis) {
            this.lastHealthCheck = now;
            return false;
        }

        try {
            const result = await this.redis.ping();
            this.isRedisAvailable = result === 'PONG';
            this.lastHealthCheck = now;
            return this.isRedisAvailable;
        } catch {
            this.isRedisAvailable = false;
            this.lastHealthCheck = now;
            return false;
        }
    }

    // ---------------------------------------------------------------------------
    // Core Operations
    // ---------------------------------------------------------------------------

    async get(key: string): Promise<string | null> {
        // Try Redis first
        if (this.redis && this.isRedisAvailable) {
            try {
                return await this.redis.get(key);
            } catch (err) {
                console.error('[Redis] GET failed, falling back to memory:', err);
                this.isRedisAvailable = false;
            }
        }

        // Fallback to memory
        return this.getFromMemory(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        // Try Redis first
        if (this.redis && this.isRedisAvailable) {
            try {
                if (ttlSeconds) {
                    await this.redis.setex(key, ttlSeconds, value);
                } else {
                    await this.redis.set(key, value);
                }
                return;
            } catch (err) {
                console.error('[Redis] SET failed, falling back to memory:', err);
                this.isRedisAvailable = false;
            }
        }

        // Fallback to memory
        this.setInMemory(key, value, ttlSeconds);
    }

    async incr(key: string): Promise<number> {
        // Try Redis first
        if (this.redis && this.isRedisAvailable) {
            try {
                return await this.redis.incr(key);
            } catch (err) {
                console.error('[Redis] INCR failed, falling back to memory:', err);
                this.isRedisAvailable = false;
            }
        }

        // Fallback to memory
        return this.incrInMemory(key);
    }

    async del(key: string): Promise<void> {
        // Try Redis first
        if (this.redis && this.isRedisAvailable) {
            try {
                await this.redis.del(key);
                return;
            } catch (err) {
                console.error('[Redis] DEL failed, falling back to memory:', err);
                this.isRedisAvailable = false;
            }
        }

        // Fallback to memory
        this.memoryCache.delete(key);
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        if (this.redis && this.isRedisAvailable) {
            try {
                await this.redis.expire(key, ttlSeconds);
                return;
            } catch (err) {
                console.error('[Redis] EXPIRE failed:', err);
                this.isRedisAvailable = false;
            }
        }

        // Update expiry in memory cache
        const entry = this.memoryCache.get(key);
        if (entry) {
            entry.expiry = Date.now() + ttlSeconds * 1000;
        }
    }

    // ---------------------------------------------------------------------------
    // Memory Cache Operations
    // ---------------------------------------------------------------------------

    private getFromMemory(key: string): string | null {
        const entry = this.memoryCache.get(key);
        if (!entry) return null;

        // Check expiry
        if (entry.expiry > 0 && Date.now() > entry.expiry) {
            this.memoryCache.delete(key);
            return null;
        }

        return entry.value;
    }

    private setInMemory(key: string, value: string, ttlSeconds?: number): void {
        const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
        this.memoryCache.set(key, { value, expiry });

        // Cleanup old entries periodically (simple LRU-like behavior)
        if (this.memoryCache.size > 10000) {
            this.cleanupMemoryCache();
        }
    }

    private incrInMemory(key: string): number {
        const current = this.getFromMemory(key);
        const newValue = (parseInt(current || '0', 10) + 1).toString();

        // Preserve existing TTL if exists
        const entry = this.memoryCache.get(key);
        const expiry = entry?.expiry || 0;

        this.memoryCache.set(key, { value: newValue, expiry });
        return parseInt(newValue, 10);
    }

    private cleanupMemoryCache(): void {
        const now = Date.now();
        let deleted = 0;

        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiry > 0 && now > entry.expiry) {
                this.memoryCache.delete(key);
                deleted++;
            }
            // Stop if we've cleaned enough
            if (deleted > 1000) break;
        }
    }

    // ---------------------------------------------------------------------------
    // Status
    // ---------------------------------------------------------------------------

    isConnected(): boolean {
        return this.isRedisAvailable;
    }

    getStats(): { connected: boolean; memoryCacheSize: number } {
        return {
            connected: this.isRedisAvailable,
            memoryCacheSize: this.memoryCache.size,
        };
    }
}

// =============================================================================
// Singleton Export
// =============================================================================

// Global singleton to prevent multiple connections in dev (hot reload)
const globalForRedis = globalThis as unknown as {
    redis: RedisWithFallback | undefined;
};

export const redis =
    globalForRedis.redis ?? new RedisWithFallback();

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}
