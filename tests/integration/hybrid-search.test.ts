import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { searchDocuments } from '../../src/lib/document-search';
import { createServerSupabaseClient } from '../../src/lib/supabase';

// Helper to insert dummy data if needed, but for now we test with existing or assume DB is ready
// This test might fail if no embeddings or full text index data exists.
// We will focus on calling the function and ensuring safety/no-crash, 
// matching against whatever is in the DB (might be empty).

async function runSearchTest() {
    console.log('=== Integration Test: Hybrid Search ===');

    try {
        const query = "货币资金";
        console.log(`Searching for: "${query}"`);

        const result = await searchDocuments(query, {
            year: 2024,
            docTypes: ['knowledge'] // Assuming standard type
        });

        console.log('Search completed successfully.');
        console.log('Total Matches:', result.totalMatches);

        if (result.documents.length > 0) {
            const topDoc = result.documents[0];
            console.log('Top Document:', topDoc.documentName);
            console.log('Relevance Score:', topDoc.relevanceScore);
            console.log('Matched Chunks:', topDoc.matchedChunks.length);
            console.log('Top Chunk score (RRF):', topDoc.matchedChunks[0].similarity);
        } else {
            console.log('No matches found (Expected if DB is dry).');
        }

        console.log('PASS: RPC call and wrapper executed without error.');

    } catch (error) {
        console.error('FAIL: Search test encountered error:', error);
        process.exit(1);
    }
}

runSearchTest().catch(e => {
    console.error(e);
    process.exit(1);
});
