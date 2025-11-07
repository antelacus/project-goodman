# Supabase Database Setup

This directory contains SQL migrations and setup instructions for the Supabase PostgreSQL database with pgvector extension.

## Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: project-goodman (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free

### 2. Run Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click "New Query"
4. Copy the entire contents of `migrations/20250107000000_init_vector_database.sql`
5. Paste into the SQL editor
6. Click "Run" button (or press Cmd/Ctrl + Enter)
7. Verify success message appears

### 3. Get API Credentials

1. Navigate to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key: `eyJ...` (long JWT token)

### 4. Configure Environment Variables

Add to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Keep existing OpenAI key
OPENAI_API_KEY=your_openai_key
```

### 5. Migrate Existing Data

Run the migration script to import existing documents from `data/documents/`:

```bash
npm run migrate-data
```

This will:
- Read JSON files from `data/documents/`
- Insert documents and chunks into Supabase
- Verify data integrity

### 6. Enable Vector Index (After Migration)

After migrating your data, run this SQL to create the vector index:

```sql
CREATE INDEX idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Note**: Creating the index after data insertion is faster for bulk operations.

## Database Schema

### Tables

#### `documents`
Stores document metadata for both knowledge (pre-loaded) and business (user-uploaded) documents.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique document ID |
| name | TEXT | Document filename |
| doc_category | TEXT | 'knowledge' or 'business' |
| doc_type | TEXT | File type (pdf, excel, txt, etc.) |
| upload_time | TIMESTAMPTZ | Upload timestamp |
| status | TEXT | 'processing', 'ready', or 'error' |
| size | INTEGER | File size in bytes |
| summary | JSONB | Document summary metadata |
| created_at | TIMESTAMPTZ | Record creation time |

#### `document_chunks`
Stores text chunks with their vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | Unique chunk ID |
| document_id | TEXT (FK) | References documents.id |
| chunk_index | INTEGER | Chunk order index |
| content | TEXT | Text content of chunk |
| embedding | vector(1536) | OpenAI embedding vector |
| created_at | TIMESTAMPTZ | Record creation time |

### Functions

#### `match_documents(query_embedding, match_count, filter_doc_ids)`
Performs vector similarity search using cosine distance.

**Parameters**:
- `query_embedding`: vector(1536) - Query embedding to search for
- `match_count`: INT (default 3) - Number of results to return
- `filter_doc_ids`: TEXT[] (optional) - Filter by specific document IDs

**Returns**: Table with id, document_id, content, chunk_index, similarity

**Example**:
```sql
SELECT * FROM match_documents(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_count := 5,
  filter_doc_ids := ARRAY['doc-1', 'doc-2']
);
```

## Monitoring

### Check Database Usage

```sql
-- Count documents by category
SELECT doc_category, COUNT(*) FROM documents GROUP BY doc_category;

-- Count total chunks
SELECT COUNT(*) FROM document_chunks;

-- Check storage size
SELECT pg_size_pretty(pg_total_relation_size('document_chunks'));
```

### Test Vector Search

```sql
-- Test search function (use real embedding)
SELECT * FROM match_documents(
  query_embedding := (SELECT embedding FROM document_chunks LIMIT 1),
  match_count := 3
);
```

## Troubleshooting

### Error: "extension 'vector' does not exist"
Run: `CREATE EXTENSION IF NOT EXISTS vector;` in SQL Editor

### Slow queries
- Create the IVFFlat index on embeddings column
- Increase `lists` parameter if you have >10,000 chunks

### Connection errors in Vercel
- Ensure environment variables are set in Vercel dashboard
- Check Supabase project is not paused (free tier auto-pauses after 7 days inactivity)

## Free Tier Limits

- **Storage**: 500MB (current usage: ~6MB for 50 docs)
- **Bandwidth**: 5GB/month
- **API Requests**: Unlimited
- **Auto-pause**: After 7 days inactivity (instant wake-up)

## Next Steps

After setup is complete:
1. Run data migration script
2. Test API endpoints locally
3. Deploy to Vercel with environment variables
4. Monitor usage in Supabase dashboard
