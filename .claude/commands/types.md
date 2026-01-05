---
description: Regenerate Supabase TypeScript types and validate compilation
---

# Types Command

Regenerate Supabase types and verify they compile correctly.

## Process

1. **Check for Supabase project ID** in environment or ask user
2. **Regenerate types** from current database schema
3. **Validate TypeScript compilation** with `tsc --noEmit`
4. **Report any type errors** that need fixing

## Commands

### Regenerate Types

```bash
npx supabase gen types typescript \
  --project-id PROJECT_ID \
  > src/lib/database/types.ts
```

### Validate Compilation

```bash
npx tsc --noEmit
```

## When to Use

Run this command after:

- Applying database migrations
- Changing table schemas
- Adding new RLS policies
- Creating new database functions

## Output

Report:
- Whether types were regenerated successfully
- Any TypeScript compilation errors
- Files that may need updates due to schema changes

## Notes

- The project ID can be found in the Supabase dashboard
- Types file is located at `src/lib/database/types.ts`
- If compilation fails, review the error messages and fix affected code
