# Known Issues & Gotchas

> **Last Updated**: 2026-01-07

## Document Processing

- PDF parsing fails with plain text content; use `.md` files for testing
- Excel parsing only supports `.xlsx` (not `.xls`), single sheet per file
- TOC detection requires actual document body to be far enough from TOC (3000+ chars)

## Database

- Vector index (IVFFlat) not yet created due to small data volume (<1000 chunks)
- 12 database indexes currently unused - may optimize after production usage analysis
- 3 RPC functions have mutable search_path warnings (documented, not critical)

## Infrastructure

- Redis in Docker container connects via `goodman-redis` hostname (not `localhost`)
- Redis connection errors on startup are expected if Redis starts after app; app retries automatically
- Docker networking requires proper `REDIS_URL` configuration in `.env`

## Development Notes

- Docker is for production only; use `npm run dev` for local development
- Environment variables with `$` characters need escaping in `.env.local`
- Supabase `.temp/` directory is gitignored; regenerated automatically
