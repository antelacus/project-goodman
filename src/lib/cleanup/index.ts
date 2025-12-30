/**
 * Cleanup Module
 *
 * Provides scheduled and lazy cleanup of expired guest documents.
 */

export {
    startCleanupScheduler,
    cleanupExpiredGuests,
    lazyCleanupForSession,
    forceCleanup,
} from './guest-cleanup';
