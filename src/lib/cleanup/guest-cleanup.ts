/**
 * Guest Document Cleanup
 *
 * Provides scheduled and lazy cleanup of expired guest documents.
 * Uses node-cron for scheduled cleanup within the Next.js process.
 */

import cron from 'node-cron';
import { createServerSupabaseClient } from '@/lib/database/supabase';
import { logSecurityEvent } from '@/lib/security/audit-logger';

// =============================================================================
// Scheduled Cleanup
// =============================================================================

let isSchedulerStarted = false;

/**
 * Start the cleanup scheduler
 * Should be called once during application initialization
 */
export function startCleanupScheduler() {
    if (isSchedulerStarted) {
        console.log('[Cleanup] Scheduler already started, skipping');
        return;
    }

    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('[Cleanup] Running scheduled cleanup...');
        await cleanupExpiredGuests();
    });

    isSchedulerStarted = true;
    console.log('[Cleanup] Scheduled guest cleanup task (hourly at minute 0)');
}

/**
 * Clean up all expired guest documents
 */
interface ExpiredDoc {
    id: string;
    file_url: string | null;
    owner_id: string | null;
    name: string;
}

export async function cleanupExpiredGuests(): Promise<{
    documentsDeleted: number;
    sessionsAffected: number;
}> {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    try {
        // 1. Query expired documents
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: expiredDocs, error: queryError } = await (supabase
            .from('documents')
            .select('id, file_url, owner_id, name')
            .eq('owner_type', 'guest')
            .lt('expires_at', now) as any);

        if (queryError) {
            console.error('[Cleanup] Error querying expired documents:', queryError);
            return { documentsDeleted: 0, sessionsAffected: 0 };
        }

        const docs = (expiredDocs || []) as ExpiredDoc[];
        if (docs.length === 0) {
            console.log('[Cleanup] No expired documents to clean');
            return { documentsDeleted: 0, sessionsAffected: 0 };
        }

        console.log(`[Cleanup] Found ${docs.length} expired guest documents`);

        // Track unique sessions
        const sessionIds = new Set<string>();
        let deletedCount = 0;

        // 2. Delete each document
        for (const doc of docs) {
            try {
                // Delete Storage file if exists
                if (doc.file_url) {
                    const { error: storageError } = await supabase.storage
                        .from('document-files')
                        .remove([doc.file_url]);

                    if (storageError) {
                        console.warn(`[Cleanup] Failed to delete storage file for ${doc.id}:`, storageError);
                    }
                }

                // Delete database record (cascades to chunks)
                const { error: deleteError } = await supabase
                    .from('documents')
                    .delete()
                    .eq('id', doc.id);

                if (deleteError) {
                    console.error(`[Cleanup] Failed to delete document ${doc.id}:`, deleteError);
                    continue;
                }

                deletedCount++;
                if (doc.owner_id) {
                    sessionIds.add(doc.owner_id);
                }

                console.log(`[Cleanup] Deleted document: ${doc.name} (${doc.id})`);
            } catch (err) {
                console.error(`[Cleanup] Error processing document ${doc.id}:`, err);
            }
        }

        // 3. Log cleanup event
        if (deletedCount > 0) {
            logSecurityEvent('cleanup_completed', '127.0.0.1', 'system', {
                documentsDeleted: deletedCount,
                sessionsAffected: sessionIds.size,
            });
        }

        console.log(`[Cleanup] Completed: ${deletedCount} documents deleted from ${sessionIds.size} sessions`);

        return {
            documentsDeleted: deletedCount,
            sessionsAffected: sessionIds.size,
        };
    } catch (error) {
        console.error('[Cleanup] Unexpected error:', error);
        return { documentsDeleted: 0, sessionsAffected: 0 };
    }
}

// =============================================================================
// Lazy Cleanup
// =============================================================================

interface LazyCleanupDoc {
    id: string;
    file_url: string | null;
}

/**
 * Lazy cleanup for a specific session
 * Call this when a session is being used to clean up any expired documents
 */
export async function lazyCleanupForSession(sessionId: string): Promise<number> {
    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();

    try {
        // Query expired documents for this session
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: expiredDocs, error: queryError } = await (supabase
            .from('documents')
            .select('id, file_url')
            .eq('owner_id', sessionId)
            .eq('owner_type', 'guest')
            .lt('expires_at', now) as any);

        if (queryError || !expiredDocs || expiredDocs.length === 0) {
            return 0;
        }

        const docs = expiredDocs as LazyCleanupDoc[];
        let deletedCount = 0;

        for (const doc of docs) {
            try {
                // Delete Storage file if exists
                if (doc.file_url) {
                    await supabase.storage
                        .from('document-files')
                        .remove([doc.file_url]);
                }

                // Delete database record
                await supabase.from('documents').delete().eq('id', doc.id);
                deletedCount++;
            } catch {
                // Ignore individual failures in lazy cleanup
            }
        }

        if (deletedCount > 0) {
            console.log(`[Cleanup] Lazy cleanup: ${deletedCount} expired documents for session ${sessionId.substring(0, 8)}...`);
        }

        return deletedCount;
    } catch {
        return 0;
    }
}

// =============================================================================
// Manual Cleanup API
// =============================================================================

/**
 * Force cleanup all expired documents (for admin use)
 */
export async function forceCleanup(): Promise<{
    documentsDeleted: number;
    sessionsAffected: number;
}> {
    console.log('[Cleanup] Force cleanup triggered by admin');
    return cleanupExpiredGuests();
}
