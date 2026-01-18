/**
 * Next.js Instrumentation
 *
 * This file is loaded once when the Next.js server starts.
 * Used for initializing background tasks and services.
 *
 * V3.10: Initializes cleanup scheduler and admin account.
 */

export async function register() {
    // Only run in Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('[Instrumentation] Initializing server-side services...');

        try {
            // Dynamic import to avoid webpack bundling @sentry/node for client
            const { initErrorTracking } = await import('@/lib/observability/error-tracking');
            await initErrorTracking();
        } catch (error) {
            console.error('[Instrumentation] Failed to initialize error tracking:', error);
        }

        try {
            // Start cleanup scheduler
            const { startCleanupScheduler } = await import('@/lib/cleanup');
            startCleanupScheduler();
            console.log('[Instrumentation] Cleanup scheduler started');
        } catch (error) {
            console.error('[Instrumentation] Failed to start cleanup scheduler:', error);
        }

        try {
            // Ensure admin account exists
            const { ensureAdminAccount } = await import('@/lib/auth');
            await ensureAdminAccount();
            console.log('[Instrumentation] Admin account verified');
        } catch (error) {
            console.error('[Instrumentation] Failed to initialize admin account:', error);
        }

        console.log('[Instrumentation] Server-side initialization complete');
    }
}
