/**
 * Batch 3 Type Safety Tests
 *
 * Verifies that the type-safe database helpers work correctly
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServerSupabaseClient, searchDocumentsHybrid, matchDocuments } from '@/lib/database';
import OpenAI from 'openai';

async function testSearch() {
  console.log("Testing Batch 3 type-safe database helpers...\n");

  // Test 1: Create client
  console.log("1. Creating Supabase client...");
  const supabase = createServerSupabaseClient();
  console.log("   ✓ Client created\n");

  // Test 2: Generate embedding
  console.log("2. Generating test embedding...");
  const openai = new OpenAI();
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: "流动比率是什么",
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  console.log("   ✓ Embedding generated (length:", queryEmbedding.length, ")\n");

  // Test 3: Test searchDocumentsHybrid
  console.log("3. Testing searchDocumentsHybrid...");
  try {
    const results = await searchDocumentsHybrid(supabase, {
      query_embedding: JSON.stringify(queryEmbedding),
      query_text: "流动比率",
      match_count: 3,
    });
    console.log("   ✓ Search returned", results.length, "results");
    if (results.length > 0) {
      console.log("   First result:", results[0].document_name?.substring(0, 50));
    }
  } catch (err) {
    console.log("   ✗ Error:", (err as Error).message);
  }

  // Test 4: Test matchDocuments
  console.log("\n4. Testing matchDocuments...");
  try {
    const results = await matchDocuments(supabase, {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 3,
    });
    console.log("   ✓ Match returned", results.length, "results");
    if (results.length > 0) {
      console.log("   First result ID:", results[0].id);
    }
  } catch (err) {
    console.log("   ✗ Error:", (err as Error).message);
  }

  console.log("\n✓ All Batch 3 type tests completed!");
}

testSearch().catch(console.error);
