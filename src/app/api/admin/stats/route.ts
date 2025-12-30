/**
 * Admin Stats API
 *
 * GET - Get system statistics including session counts,
 *       document counts, and storage usage.
 *
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/security/guest-session';
import { listAllSessions } from '@/lib/security/session';
import { createServerSupabaseClient } from '@/lib/database/supabase';
import { redis } from '@/lib/database/redis';
import { forceCleanup } from '@/lib/cleanup';

/**
 * GET /api/admin/stats
 * Returns system-wide statistics
 */
export async function GET(request: NextRequest) {
    const adminResult = await requireAdmin(request);
    if (isErrorResponse(adminResult)) {
        return adminResult;
    }

    try {
        const supabase = createServerSupabaseClient();

        // Get session counts
        const sessions = await listAllSessions();
        const activeAdmins = sessions.filter(s => s.role === 'admin').length;
        const activeGuests = sessions.filter(s => s.role === 'guest').length;

        // Get document counts by category
        const { count: knowledgeCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('doc_category', 'knowledge');

        const { count: businessCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('doc_category', 'business');

        const { count: tempCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('owner_type', 'guest');

        const documentsCount = {
            knowledge: knowledgeCount || 0,
            business: businessCount || 0,
            temp: tempCount || 0,
        };

        // Get pending cleanup count (expired guest documents)
        const now = new Date().toISOString();
        const { count: pendingCleanupCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('owner_type', 'guest')
            .lt('expires_at', now);

        // Get Redis stats
        const redisStats = redis.getStats();

        // Get user count
        const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        return NextResponse.json({
            sessions: {
                activeAdmins,
                activeGuests,
                total: sessions.length,
            },
            documents: {
                knowledge: documentsCount.knowledge,
                business: documentsCount.business,
                temp: documentsCount.temp,
                total: documentsCount.knowledge + documentsCount.business + documentsCount.temp,
                pendingCleanup: pendingCleanupCount || 0,
            },
            users: {
                total: userCount || 0,
            },
            system: {
                redisConnected: redisStats.connected,
                redisCacheSize: redisStats.memoryCacheSize,
            },
        });
    } catch (error) {
        console.error('[Admin Stats] Failed to get stats:', error);
        return NextResponse.json(
            { error: '获取统计数据失败' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/stats/cleanup
 * Trigger manual cleanup of expired guest documents
 */
export async function POST(request: NextRequest) {
    const adminResult = await requireAdmin(request);
    if (isErrorResponse(adminResult)) {
        return adminResult;
    }

    try {
        const result = await forceCleanup();

        return NextResponse.json({
            success: true,
            documentsDeleted: result.documentsDeleted,
            sessionsAffected: result.sessionsAffected,
        });
    } catch (error) {
        console.error('[Admin Stats] Failed to run cleanup:', error);
        return NextResponse.json(
            { error: '执行清理失败' },
            { status: 500 }
        );
    }
}
