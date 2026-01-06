# Known Issues & Gotchas

## Document Processing

- PDF parsing fails with plain text content; use `.md` files for testing
- Excel parsing only supports `.xlsx` (not `.xls`), single sheet per file
- TOC detection requires actual document body to be far enough from TOC (3000+ chars)

## Database

- Vector index (IVFFlat) not yet created due to small data volume (<1000 chunks)
- 12 database indexes currently unused - may optimize after production usage analysis
- 3 RPC functions have mutable search_path warnings (documented, not critical)

## Development Notes

- Docker is for production only; use `npm run dev` for local development
- Redis connection in Docker uses `host.docker.internal` or host IP
- Environment variables with `$` characters need escaping in `.env.local`
