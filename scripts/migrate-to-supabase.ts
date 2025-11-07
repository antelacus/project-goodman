/**
 * Migration script to move existing JSON documents from data/documents/
 * to Supabase database with pgvector
 *
 * Usage: npx tsx scripts/migrate-to-supabase.ts [--dry-run]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { Database } from '../src/lib/database.types';
import dotenv from 'dotenv';

// Load environment variables from .env.local
const PROJECT_ROOT = path.dirname(path.dirname(__filename)); // Get project root from script location
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.local') });

// Configuration
const DOCUMENTS_DIR = path.join(PROJECT_ROOT, 'data', 'documents');
const BATCH_SIZE = 100; // Insert chunks in batches for better performance

// Check for dry-run mode
const isDryRun = process.argv.includes('--dry-run');

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

// Type definitions
interface JSONChunk {
  content: string;
  embedding: number[];
  document_id?: string;
  document_name?: string;
  chunk_index?: number;
}

interface MigrationStats {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDocuments: number;
  totalChunks: number;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Parse JSON file and extract document metadata and chunks
 */
function parseDocumentFile(filePath: string, fileName: string): {
  documentId: string;
  documentName: string;
  chunks: Database['public']['Tables']['document_chunks']['Insert'][];
  size: number;
} {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data: JSONChunk[] = JSON.parse(fileContent);

  if (!Array.isArray(data)) {
    throw new Error('JSON file must contain an array of chunks');
  }

  if (data.length === 0) {
    throw new Error('JSON file contains no chunks');
  }

  // Validate chunk structure
  const firstChunk = data[0];
  if (!firstChunk.content || !firstChunk.embedding) {
    throw new Error('Invalid chunk structure: missing content or embedding');
  }

  // Generate document ID from filename (remove .json extension)
  const documentName = fileName.replace('.json', '');
  const documentId = `doc-${documentName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')}`;

  // Process chunks
  const chunks = data.map((chunk, index) => ({
    id: `${documentId}-chunk-${chunk.chunk_index ?? index}`,
    document_id: documentId,
    chunk_index: chunk.chunk_index ?? index,
    content: chunk.content,
    embedding: chunk.embedding,
  }));

  // Validate embedding dimensions (should be 1536 for OpenAI text-embedding-3-small)
  const embeddingDim = chunks[0].embedding.length;
  if (embeddingDim !== 1536) {
    console.warn(`⚠️  Warning: ${fileName} has embeddings with ${embeddingDim} dimensions (expected 1536)`);
  }

  return {
    documentId,
    documentName,
    chunks,
    size: Buffer.byteLength(fileContent, 'utf-8'),
  };
}

/**
 * Insert document and chunks into Supabase
 */
async function migrateDocument(
  supabase: SupabaseClient<Database>,
  filePath: string,
  fileName: string,
  stats: MigrationStats
): Promise<boolean> {
  try {
    console.log(`\n📄 Processing: ${fileName}`);

    // Parse document file
    const { documentId, documentName, chunks, size } = parseDocumentFile(filePath, fileName);

    console.log(`   Document ID: ${documentId}`);
    console.log(`   Chunks: ${chunks.length}`);
    console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);

    if (isDryRun) {
      console.log(`   ✓ Dry run - would insert ${chunks.length} chunks`);
      stats.totalDocuments += 1;
      stats.totalChunks += chunks.length;
      return true;
    }

    // Generate summary from first few chunks
    const summaryText = chunks
      .slice(0, 3)
      .map(c => c.content)
      .join(' ')
      .substring(0, 300);

    // Insert document metadata
    const documentData: Database['public']['Tables']['documents']['Insert'] = {
      id: documentId,
      name: documentName,
      doc_category: 'knowledge',
      doc_type: 'json',
      status: 'ready',
      size,
      summary: {
        document_type: '知识型文档',
        summary: summaryText + (summaryText.length >= 300 ? '...' : ''),
        key_metrics: ['内容分析', '知识提取', '信息检索'],
        time_period: '当前版本',
      },
    };

    const { error: docError } = await supabase
      .from('documents')
      .insert(documentData);

    if (docError) {
      // Check if error is due to duplicate key
      if (docError.code === '23505') {
        console.log(`   ⚠️  Document already exists, updating instead`);
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            name: documentName,
            size,
            upload_time: new Date().toISOString(),
          })
          .eq('id', documentId);

        if (updateError) {
          throw updateError;
        }

        // Delete existing chunks before re-inserting
        const { error: deleteError } = await supabase
          .from('document_chunks')
          .delete()
          .eq('document_id', documentId);

        if (deleteError) {
          throw deleteError;
        }
      } else {
        throw docError;
      }
    }

    // Insert chunks in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (chunksError) {
        throw chunksError;
      }

      console.log(`   ✓ Inserted chunks ${i + 1}-${Math.min(i + BATCH_SIZE, chunks.length)} of ${chunks.length}`);
    }

    console.log(`   ✅ Successfully migrated ${fileName}`);
    stats.totalDocuments += 1;
    stats.totalChunks += chunks.length;
    return true;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error migrating ${fileName}: ${errorMessage}`);
    stats.errors.push({ file: fileName, error: errorMessage });
    return false;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting migration to Supabase...\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No data will be inserted\n');
  }

  // Check if documents directory exists
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    console.error(`❌ Error: Documents directory not found: ${DOCUMENTS_DIR}`);
    process.exit(1);
  }

  // Get all JSON files
  const files = fs.readdirSync(DOCUMENTS_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('⚠️  No JSON files found in documents directory');
    process.exit(0);
  }

  console.log(`Found ${files.length} JSON files to migrate:\n`);
  files.forEach(file => console.log(`  - ${file}`));

  // Initialize Supabase client
  const supabase = getSupabaseClient();

  // Test connection
  console.log('\n🔗 Testing Supabase connection...');
  const { error: connectionError } = await supabase.from('documents').select('count').limit(1);

  if (connectionError) {
    console.error('❌ Failed to connect to Supabase:', connectionError.message);
    console.error('Please check your environment variables and database schema');
    process.exit(1);
  }
  console.log('✅ Connection successful\n');

  // Migration stats
  const stats: MigrationStats = {
    totalFiles: files.length,
    successfulFiles: 0,
    failedFiles: 0,
    totalDocuments: 0,
    totalChunks: 0,
    errors: [],
  };

  // Migrate each file
  for (const file of files) {
    const filePath = path.join(DOCUMENTS_DIR, file);
    const success = await migrateDocument(supabase, filePath, file, stats);

    if (success) {
      stats.successfulFiles++;
    } else {
      stats.failedFiles++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total files processed:    ${stats.totalFiles}`);
  console.log(`Successful migrations:    ${stats.successfulFiles} ✅`);
  console.log(`Failed migrations:        ${stats.failedFiles} ❌`);
  console.log(`Total documents inserted: ${stats.totalDocuments}`);
  console.log(`Total chunks inserted:    ${stats.totalChunks}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (stats.failedFiles > 0) {
    console.log('\n⚠️  Migration completed with errors');
    process.exit(1);
  } else if (isDryRun) {
    console.log('\n✅ Dry run completed successfully');
    console.log('   Run without --dry-run to perform actual migration');
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Create vector index: Run the SQL in supabase/README.md');
    console.log('   2. Test vector search in Supabase SQL Editor');
    console.log('   3. Update API routes to use Supabase');
  }
}

// Run migration
migrate().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
