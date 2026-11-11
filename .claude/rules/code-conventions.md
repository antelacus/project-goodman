# Code Conventions

> **Scope**: Project-specific implementation details only.
> **Global conventions**: universal principles, security, error handling, documentation philosophy.
> **Boundary principle**: If it applies to ANY TypeScript/Next.js project → global. If it's specific to this codebase (paths, tools, workarounds) → here.

## File Organization

- Prompt templates stored in `src/lib/ai/prompts/*.md`, loaded via `src/lib/ai/prompts/index.ts`
- Financial metric names defined as constants in `src/lib/financial/metric-names.ts`
- Document types and periods use mapping constants in `src/lib/documents/constants.ts`
- Database clients in `src/lib/database/` (Supabase for data, Redis for sessions/cache)
- Observability in `src/lib/observability/` (error tracking with GlitchTip)
- Agent tools defined in `src/lib/tools/`, quick-actions in `src/app/api/quick-actions/`
- Components organized by domain with barrel exports (`index.ts`) for clean imports

## Supabase

- Run `npx supabase gen types typescript` after every migration to keep `src/lib/database/types.ts` in sync
- Verify schema changes work in Supabase before writing dependent code

## Database Security

The server reaches the database only through `createServerSupabaseClient()` (`src/lib/database/supabase.ts`), on the secret key (role `service_role`, not bound by RLS). The legacy anon and service_role keys are disabled and no publishable key exists, so nothing can call the API as `anon`; API routes (`src/lib/security/`) are the security boundary, and reading a document by id goes through `src/lib/documents/access.ts`.

Defense in depth, kept by `supabase/migrations/20261111132938_revoke_anon_access.sql`:

- `anon`, `authenticated` and `PUBLIC` hold no right on any table, sequence or function in `public`, and objects later migrations create get none either (default privileges of `postgres`).
- Every table in `public` has RLS enabled, with no policies.
- Exception: objects `supabase_admin` creates in `public` still default to `anon` — `postgres` cannot change its defaults. Run `supabase/tests/access.sql` on the live database after every migration; it fails on any opening. Before ever creating a publishable key, re-evaluate this: it would make `anon` reachable.

A new function the app calls needs no grant: the default privileges give `service_role` EXECUTE.

## State Management

- Use Redis for any state that must survive restarts (sessions, rate limits, locks)
- Never use in-memory `Map` for production state in Docker environment

## API Standards

- All API routes use `createErrorResponse()` for error responses
- All inputs validated with Zod schemas from `src/lib/validation/api-schemas.ts`
- Standard response format: `{ success: boolean, data?: T, error?: string }`
- Admin operations require password verification via `src/lib/security/admin-auth.ts`

## Styling

- Use Tailwind CSS exclusively; no inline `style={{}}` objects
- Prefer Lucide React icons over emoji for UI elements (better consistency and accessibility)
- Exception: Process log event indicators may use emoji for quick visual distinction

## LangGraph / AI Agent

- LangGraph state interfaces must have explicit types, never `any`
- Tool registrations should happen once at module load, not per-request
- Search is keyword-only (PGroonga, `src/lib/search/`); regulation answers cite evidence ids that `src/lib/citations/` turns into article references

## ESLint & TypeScript Workarounds

> Global principle: "Avoid `as any`; if unavoidable, add `// REASON: ...` comment" (see `~/.claude/CLAUDE.md`)
> Below are **project-specific cases** where this applies.

### Justified `any` Cases in This Project

```typescript
// REASON: XLSX returns unknown[], cast needed for row/cell operations on untyped external data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
```

Known justified cases:

- XLSX library parsing (returns untyped data)
- LangGraph DeepPartial state initialization

### ESLint Config Quirks

**Unused variables**: ESLint does not recognize underscore prefix (`_unused`) in this project:

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // req unused but required by Next.js signature
}
```

**React hooks order**: Define dependency callbacks before using them:

```typescript
// ✅ Define handleEvent first, then use in sendMessage deps
const handleEvent = useCallback((event: StreamEvent) => { ... }, [deps]);
const sendMessage = useCallback((msg: string) => {
  // uses handleEvent
}, [handleEvent, ...otherDeps]);
```

## Code Documentation

> See global guideline file → Documentation Philosophy for full guidelines.

Quick reference: Architecture in `docs/`, file headers for complex files only, code comments explain "why" not "what".

## Language Standards

- **Code**: English for all code (functions, variables, comments)
- **User-facing content**: Chinese (中文) for UI strings, labels, business domain terms (财务指标名称)
- **Documentation in `/docs`**: **Simplified Chinese (简体中文)** for all documents (PRDs, design docs, development tracks), while keeping code examples and technical terminology in English. `docs/DEPLOYMENT_CHECKLIST.md` is an exception.
- **CLAUDE.md**: English (for broader accessibility)
- **CHANGELOG.md**: 中文 (Keep a Changelog 格式)
- **README.md**: Chinese (中文) for user familiarization
