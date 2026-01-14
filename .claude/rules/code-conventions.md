# Code Conventions

> **Scope**: Project-specific implementation details only.
> **Global conventions**: `~/.claude/CLAUDE.md` (universal principles, security, error handling, documentation philosophy)
>
> **Boundary principle**: If it applies to ANY TypeScript/Next.js project → global. If it's specific to this codebase (paths, tools, workarounds) → here.

## File Organization

- Prompt templates stored in `src/lib/prompts/*.txt`, loaded via `src/lib/prompts/index.ts`
- Financial metric names defined as constants in `src/lib/financial/metric-names.ts`
- Document types and periods use mapping constants in `src/lib/documents/constants.ts`
- Database clients in `src/lib/database/` (Supabase for data, Redis for sessions/cache)
- Agent tools defined in `src/lib/tools/`, quick-actions in `src/app/api/quick-actions/`
- Components organized by domain with barrel exports (`index.ts`) for clean imports

## Supabase

- Run `npx supabase gen types typescript` after every migration to keep `src/lib/database/types.ts` in sync
- Service Role Key usage must be isolated to `src/lib/` server modules with runtime `typeof window` check
- Verify schema changes work in Supabase before writing dependent code

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
- Document search uses hybrid retrieval (vector + keyword) with RRF fusion scoring

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
- Zod internal `_def` access for schema introspection
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

> See `~/.claude/CLAUDE.md` → Documentation Philosophy for full guidelines.

Quick reference: Architecture in `docs/`, file headers for complex files only, code comments explain "why" not "what".

## Language Standards

- **Code**: English for all code (functions, variables, comments)
- **User-facing content**: Chinese (中文) for UI strings, labels, business domain terms (财务指标名称)
- **Documentation in `/docs`**: **Simplified Chinese (简体中文)** for all documents (PRDs, design docs, development tracks), while keeping code examples and technical terminology in English. `docs/DEPLOYMENT_CHECKLIST.md` is an exception.
- **CLAUDE.md, CHANGELOG.md**: English (for broader accessibility)
- **README.md**: Chinese (中文) for user familiarization
