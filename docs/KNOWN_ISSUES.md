# Known Issues & Gotchas

> **Last Updated**: 2026-01-08 (v4.0.2: Added evaluate_expression tool)

## Quick Actions

- **Data Extract**: Sometimes fails to extract data from documents; intermittent issue, needs more observation to identify root cause

## Document Processing

- PDF parsing fails with plain text content; use `.md` files for testing
- Excel parsing only supports single sheet per file
- TOC detection requires actual document body to be far enough from TOC (3000+ chars)
- **OCR not supported**: PDFs must be searchable text format, not scanned images

## Database

- Vector index (IVFFlat) not yet created due to small data volume (<1000 chunks)
- 20 database indexes currently unused - may optimize after production usage analysis
- 4 RPC functions have mutable search_path warnings (not critical for service-role access)
- **RLS not enabled** on `users` and `guest_activity` tables - acceptable since app uses service role key server-side only
- 9 tables have permissive RLS policies (`USING (true)`) - intentional for service role access

## Infrastructure

- Redis in Docker container connects via `goodman-redis` hostname (not `localhost`)
- Redis connection errors on startup are expected if Redis starts after app; app retries automatically
- Docker networking requires proper `REDIS_URL` configuration in `.env`

## Process Transparency

- **Page-level sourcing not available**: Cannot link to specific page numbers where financial data was found
- **No process history**: Process events are only available during current response; not persisted for later review

## UI/UX

- **Process Log source links**: Clicking document link in collapsible process log navigates to /documents page instead of opening file preview directly
- **Sidebar session sync**: New chat session doesn't appear in sidebar until page refresh; should show immediately when agent sends first response

## Development Notes

- Docker is for production only; use `npm run dev` for local development
- Environment variables with `$` characters need escaping in `.env.local`
- Supabase `.temp/` directory is gitignored; regenerated automatically
