---
name: supabase-migrations
description: Enforces Supabase migration conventions when working with database schemas, migrations in supabase/migrations/, or database types
---

# Supabase Migration Conventions

Apply these rules when working with database migrations or schema changes.

## Post-Migration Checklist

After ANY migration change, you MUST:

1. **Regenerate types**: `npx supabase gen types typescript --project-id <id> > src/lib/database/types.ts`
2. **Verify types compile**: `npx tsc --noEmit`
3. **Test affected queries**: Ensure code using changed tables still works

## Migration File Naming

```bash
# Format: YYYYMMDDHHMMSS_description.sql
# Example:
20240115120000_add_user_roles.sql
20240115120100_create_audit_log_table.sql
```

## Migration Best Practices

### 1. Always Include Rollback Comments

```sql
-- Migration: Add status column to documents
-- Rollback: ALTER TABLE documents DROP COLUMN status;

ALTER TABLE documents
ADD COLUMN status text DEFAULT 'active';
```

### 2. Use Transactions for Data Migrations

```sql
BEGIN;

-- Update existing records
UPDATE documents SET status = 'active' WHERE status IS NULL;

-- Add constraint after data is clean
ALTER TABLE documents
ALTER COLUMN status SET NOT NULL;

COMMIT;
```

### 3. Index Creation

```sql
-- Create indexes concurrently to avoid locking
CREATE INDEX CONCURRENTLY idx_documents_status
ON documents(status);
```

### 4. RLS Policies

Always add RLS policies for new tables:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
ON new_table FOR SELECT
USING (auth.uid() = user_id);
```

## Type Generation Command

```bash
# From project root
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/lib/database/types.ts
```

## Schema Validation

Before applying migrations:

1. Check for breaking changes (column renames, type changes)
2. Verify foreign key relationships
3. Test with existing data patterns

## Known Issues

From `.claude/rules/known-issues.md`:

- Vector index (IVFFlat) not created yet (small data volume)
- 12 database indexes currently unused
- 3 RPC functions have mutable search_path warnings

## Key Files Reference

- `supabase/migrations/` - All migration files
- `src/lib/database/types.ts` - Auto-generated types (627 LOC)
- `src/lib/database/supabase.ts` - Supabase client
- `src/lib/database/redis.ts` - Redis client for caching
