# Repository Guidelines

## Project Structure & Module Organization

- `src/app` holds Next.js App Router pages, layouts, and API routes.
- `src/components`, `src/hooks`, `src/lib`, `src/store`, and `src/types` contain shared UI, hooks, utilities, state, and type definitions.
- `tests/unit` contains Vitest unit tests (`*.test.ts`).
- `public/` stores static assets, `docs/` has supporting docs, `scripts/` holds one-off tooling, `supabase/` contains database config/migrations, and `data/` stores project data artifacts.

## Build, Test, and Development Commands

- `npm run dev`: run Next.js locally with Turbopack.
- `npm run build`: create a production build.
- `npm run start`: serve the production build.
- `npm run lint`: run ESLint (Next.js config).
- `npm run test`: run Vitest in watch mode.
- `npm run test -- --run`: single-pass test run (CI style).
- `npm run test:coverage`: generate coverage via Vitest.
- `npm run analyze`: build with the bundle analyzer enabled.
- `npm run migrate-data` / `npm run migrate-data:dry-run`: migrate data via `scripts/migrate-to-supabase.ts`.

## Coding Style & Naming Conventions

- TypeScript + React (Next.js 15) with strict compiler settings.
- Follow existing formatting: 2-space indentation and consistent quote usage within each file.
- Components use PascalCase, hooks use `useX`, and shared logic lives in `src/lib`.
- Use the `@/` alias for `src/` imports.
- Linting uses `eslint` with `next/core-web-vitals` and `next/typescript` rules.
- Pre-commit runs `lint-staged` (`eslint --fix`, `npx tsc --noEmit`).

## Testing Guidelines

- Vitest powers unit tests under `tests/unit`.
- Name tests with `*.test.ts` and keep them close to the module behavior they cover.
- Run coverage locally when adding significant logic changes.

## Commit & Pull Request Guidelines

- Use conventional commits with scopes, e.g. `feat(v4.3): add Zod validation - Task P`, `fix(ci): add env placeholders`.
- Include task identifiers when relevant (e.g., `Task K`).
- PRs should include a short summary, tests run, linked issues/tasks, and screenshots for UI changes.

## Configuration & Security Tips

- Use `.env`/`.env.local`; start from `.env.example` and keep secrets out of git.
- CI builds rely on placeholder env values; document any new required vars.
- Database setup and migrations live in `supabase/`.

## Agent Instructions

- Load project-specific guidance from: `./.claude/rules/`.
- If rules conflict, project-specific guidance overrides global defaults.
