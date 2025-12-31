# Code Conventions

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

## LangGraph / AI Agent

- LangGraph state interfaces must have explicit types, never `any`
- Tool registrations should happen once at module load, not per-request
- Document search uses hybrid retrieval (vector + keyword) with RRF fusion scoring

## Code Documentation Standards

**Philosophy**: The project lead reviews rather than writes code. Documentation should enable understanding of **architecture and intent**, not line-by-line mechanics. Well-named code is self-documenting; comments explain "why", not "what".

**Three Levels of Documentation**:

1. **Architecture Level** (in `docs/` folder)
   - System overview and data flows
   - Key concepts and patterns used
   - For external libraries: explanation of core concepts (e.g., "What is a LangGraph StateGraph?")

2. **File Level** (only for complex/entry-point files)
   - Brief header: purpose + key exports
   - Skip for simple utility files where the filename is self-explanatory

3. **Code Level** (minimal, targeted)
   - **DO comment**: Non-obvious business logic, workarounds, "why" decisions
   - **DON'T comment**: Obvious operations, standard patterns, self-explanatory code

**For External Libraries**:

- Create ONE reference doc (e.g., `docs/LANGGRAPH_CONCEPTS.md`) explaining key concepts
- In code, use descriptive naming that maps to those concepts
- Don't repeat library documentation in every file

**Example - Good vs Over-documented**:

```typescript
// ❌ Over-documented (noisy)
/**
 * Calculates the debt-to-equity ratio
 * @param totalDebt - The total debt amount
 * @param totalEquity - The total equity amount
 * @returns The debt-to-equity ratio as a number
 */
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  // Divide debt by equity to get ratio
  return totalDebt / totalEquity;
}

// ✅ Self-documenting (clean)
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  return totalDebt / totalEquity;
}

// ✅ Comment only when "why" is non-obvious
function calculateDebtToEquity(totalDebt: number, totalEquity: number): number {
  // Return 0 instead of Infinity when equity is zero (company-specific rule)
  if (totalEquity === 0) return 0;
  return totalDebt / totalEquity;
}
```

## Language Standards

- **Code**: English for all code (functions, variables, comments)
- **User-facing content**: Chinese (中文) for UI strings, labels, business domain terms (财务指标名称)
- **Documentation in `/docs`**: **Simplified Chinese (简体中文)** for all documents (PRDs, design docs, development tracks), while keeping code examples and technical terminology in English
- **CLAUDE.md, README.md, CHANGELOG.md**: English (for broader accessibility)
