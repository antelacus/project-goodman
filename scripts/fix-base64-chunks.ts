/**
 * Fix base64-encoded chunks for markdown documents
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixChunks() {
  const documentId = '6998accc-7239-430a-86ca-058f267c5d1d';

  // Get all chunks
  const { data: chunks, error: fetchError } = await supabase
    .from('document_chunks')
    .select('id, content')
    .eq('document_id', documentId)
    .order('chunk_index');

  if (fetchError) {
    console.error('Error fetching chunks:', fetchError);
    return;
  }

  console.log(`Found ${chunks?.length} chunks to fix`);

  for (const chunk of chunks || []) {
    try {
      // Decode base64 to UTF-8
      const decoded = Buffer.from(chunk.content, 'base64').toString('utf-8');
      console.log(`\nChunk ${chunk.id}:`);
      console.log(`  Original length: ${chunk.content.length}`);
      console.log(`  Decoded length: ${decoded.length}`);
      console.log(`  Preview: ${decoded.substring(0, 80)}...`);

      // Update the chunk
      const { error: updateError } = await supabase
        .from('document_chunks')
        .update({ content: decoded })
        .eq('id', chunk.id);

      if (updateError) {
        console.error(`  Error updating chunk: ${updateError.message}`);
      } else {
        console.log(`  ✅ Updated successfully`);
      }
    } catch (e) {
      console.error(`  Error decoding chunk ${chunk.id}:`, e);
    }
  }

  console.log('\nDone!');
}

fixChunks();
