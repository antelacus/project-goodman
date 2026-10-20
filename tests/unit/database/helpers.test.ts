/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/types';
import {
  isValidMessageRole,
  convertToolCallsToDb,
  parseDbToolCalls,
} from '@/lib/database/helpers';

type RpcResult = { data: unknown; error: Error | null };

describe('database helpers', () => {
  let rpc: ReturnType<typeof vi.fn>;
  let supabase: SupabaseClient<Database>;

  beforeEach(() => {
    rpc = vi.fn();
    supabase = { rpc } as unknown as SupabaseClient<Database>;
  });

  it('validates message roles', () => {
    expect(isValidMessageRole('user')).toBe(true);
    expect(isValidMessageRole('assistant')).toBe(true);
    expect(isValidMessageRole('tool')).toBe(true);
    expect(isValidMessageRole('system')).toBe(true);
    expect(isValidMessageRole('unknown')).toBe(false);
  });

  it('converts tool calls to db format', () => {
    const result = convertToolCallsToDb([
      { id: 'call-1', name: 'search', args: { q: 'hi' } },
      { name: 'calc', args: { year: '2024' } },
    ]);

    expect(result[0]).toEqual({
      id: 'call-1',
      type: 'function',
      function: { name: 'search', arguments: JSON.stringify({ q: 'hi' }) },
    });

    expect(result[1].id).toBe('');
    expect(result[1].function.name).toBe('calc');
  });

  it('parses tool calls from jsonb safely', () => {
    expect(parseDbToolCalls(null)).toEqual([]);
    expect(parseDbToolCalls({})).toEqual([]);

    const valid = {
      id: 'call-1',
      type: 'function',
      function: { name: 'search', arguments: '{}' },
    };

    const parsed = parseDbToolCalls([valid, { bad: true }]);
    expect(parsed).toEqual([valid]);
  });
});
