import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/types';

/**
 * A stored document's full text: its chunks in order, joined with nothing in
 * between (the chunker guarantees they partition the text). Null when the
 * document has no chunks; throws when the query fails.
 */
export async function loadDocumentText(
  supabase: SupabaseClient<Database>,
  documentId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true });
  if (error) throw new Error(error.message || 'query_failed');
  if (!data || data.length === 0) return null;
  return data.map((chunk: { content: string }) => chunk.content).join('');
}
