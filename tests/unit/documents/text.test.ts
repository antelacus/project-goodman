import { loadDocumentText } from '@/lib/documents/text';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/types';

function client(result: { data: Array<{ content: string }> | null; error: { message: string } | null }) {
  const calls: unknown[][] = [];
  const chain = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), chain),
    eq: (...a: unknown[]) => (calls.push(['eq', ...a]), chain),
    order: async (...a: unknown[]) => (calls.push(['order', ...a]), result),
  };
  return { db: { from: (t: string) => (calls.push(['from', t]), chain) } as unknown as SupabaseClient<Database>, calls };
}

describe('loadDocumentText', () => {
  it('joins the chunks in chunk order with nothing in between', async () => {
    const { db, calls } = client({ data: [{ content: '第一行\n' }, { content: '第二行' }], error: null });
    expect(await loadDocumentText(db, 'doc-1')).toBe('第一行\n第二行');
    expect(calls).toContainEqual(['eq', 'document_id', 'doc-1']);
    expect(calls).toContainEqual(['order', 'chunk_index', { ascending: true }]);
  });

  it('is null for a document with no chunks', async () => {
    expect(await loadDocumentText(client({ data: [], error: null }).db, 'doc-1')).toBeNull();
  });

  it('throws when the query fails', async () => {
    await expect(loadDocumentText(client({ data: null, error: { message: 'down' } }).db, 'doc-1')).rejects.toThrow('down');
  });
});
