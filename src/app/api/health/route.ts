import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/supabase';
import { redis } from '@/lib/database/redis';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  checks: {
    database: { status: 'ok' | 'error'; latency?: number };
    redis: { status: 'ok' | 'error' | 'skipped'; latency?: number };
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const checks: HealthCheckResult['checks'] = {
    database: { status: 'error' },
    redis: { status: 'skipped' },
  };

  // Check database connection
  try {
    const dbStart = Date.now();
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = {
      status: error ? 'error' : 'ok',
      latency: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: 'error' };
  }

  // Check Redis connection
  try {
    const redisStart = Date.now();
    const isConnected = await redis.ping();
    if (isConnected) {
      checks.redis = {
        status: 'ok',
        latency: Date.now() - redisStart,
      };
    } else {
      // Redis not connected but fallback is available
      checks.redis = { status: 'skipped' };
    }
  } catch {
    checks.redis = { status: 'error' };
  }

  // Determine overall status
  const databaseOk = checks.database.status === 'ok';
  const redisOkOrSkipped = checks.redis.status === 'ok' || checks.redis.status === 'skipped';

  let status: HealthCheckResult['status'];
  if (databaseOk && redisOkOrSkipped) {
    status = 'healthy';
  } else if (databaseOk) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return NextResponse.json(
    {
      status,
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: status === 'unhealthy' ? 503 : 200,
    }
  );
}
