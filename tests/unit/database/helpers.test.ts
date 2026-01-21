/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/types';
import {
  searchDocumentsHybrid,
  matchDocuments,
  searchRegulationsHybrid,
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

  it('executes search_documents_hybrid RPC and returns data', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'doc-1' }], error: null } satisfies RpcResult);

    const result = await searchDocumentsHybrid(supabase, {
      query_embedding: [0.1, 0.2],
      query_text: 'test',
      match_count: 3,
      section_filter: null,
      year_filter: null,
      doc_type_filter: null,
      vector_weight: 0.7,
      keyword_weight: 0.3,
    });

    expect(result).toEqual([{ id: 'doc-1' }]);
    expect(rpc).toHaveBeenCalledWith('search_documents_hybrid', expect.any(Object));
  });

  it('throws when search_documents_hybrid returns error', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('rpc failed') } satisfies RpcResult);

    await expect(
      searchDocumentsHybrid(supabase, {
        query_embedding: [0.1],
        query_text: 'test',
        match_count: 1,
        section_filter: null,
        year_filter: null,
        doc_type_filter: null,
        vector_weight: 1,
        keyword_weight: 0,
      })
    ).rejects.toThrow('rpc failed');
  });

  it('executes match_documents RPC and returns data', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'doc-2' }], error: null } satisfies RpcResult);

    const result = await matchDocuments(supabase, {
      query_embedding: [0.4],
      match_count: 2,
      filter_doc_ids: ['doc-2'],
    });

    expect(result).toEqual([{ id: 'doc-2' }]);
    expect(rpc).toHaveBeenCalledWith('match_documents', expect.any(Object));
  });

  it('executes search_regulations_hybrid RPC and returns data', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'reg-1' }], error: null } satisfies RpcResult);

    const result = await searchRegulationsHybrid(supabase, {
      p_query_embedding: [0.3],
      p_keywords: ['policy'],
      p_limit: 5,
    });

    expect(result).toEqual([{ id: 'reg-1' }]);
    expect(rpc).toHaveBeenCalledWith('search_regulations_hybrid', expect.any(Object));
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
