/**
 * Utility: seed-regulation.ts
 *
 * Seeds regulation articles into the 'structured_regulations' table.
 * Extracts articles from JSON documents and structures them for compliance search.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { extractRegulationArticles } from '../src/lib/structured-extraction';

// Load environment variables
const PROJECT_ROOT = path.dirname(path.dirname(__filename));
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Starting regulation seeding...');

    const docId = 'doc-增值税法';

    // 1. Get document content
    // We'll read from the JSON file as source of truth for text
    const jsonPath = path.join(PROJECT_ROOT, 'data', 'documents', '增值税法.json');
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Combine chunks to get full text (simplified, assuming order is correct)
    // Actually, the first chunk seems to have a lot. Let's just use the first chunk for now
    // or combine them if they are sequential.
    // The migration script preserved order.
    const fullText = data.map((c: any) => c.content).join('\n');

    console.log(`Extracted text length: ${fullText.length}`);

    // 2. Extract articles
    console.log('Extracting articles...');
    const articles = extractRegulationArticles(fullText);
    console.log(`Found ${articles.length} articles`);

    if (articles.length === 0) {
        console.error('No articles found!');
        return;
    }

    // 3. Insert into structured_regulations
    console.log('Inserting into structured_regulations...');

    // First, clear existing entries for this doc to avoid duplicates
    await supabase.from('structured_regulations').delete().eq('document_id', docId);

    const rows = articles.map(article => ({
        document_id: docId,
        regulation_name: '中华人民共和国增值税法', // Hardcoded for this file
        article_number: article.articleNumber,
        sub_article: article.subArticle,
        title: article.title,
        content: article.content,
        keywords: article.keywords,
        // hierarchy: article.hierarchy // Schema expects JSONB, let's skip for now or format it
    }));

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from('structured_regulations').insert(batch);

        if (error) {
            console.error('Error inserting batch:', error);
        } else {
            console.log(`Inserted batch ${i / batchSize + 1}`);
        }
    }

    console.log('Seeding complete!');
}

seed().catch(console.error);
