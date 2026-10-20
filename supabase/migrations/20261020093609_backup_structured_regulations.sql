-- Snapshot of the articles before the v4.7.0 re-split (REQ §5.6). The backup
-- schema is not exposed through the Data API, so the copy needs no grants.
-- Dropped in v4.7.0 Phase 6.
create schema if not exists backup;
create table backup.structured_regulations_v4_6 as table public.structured_regulations;
