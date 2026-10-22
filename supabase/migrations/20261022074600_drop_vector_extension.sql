-- REQ §5.8: no column uses the vector type since 20261022073400, and search is
-- keyword-only. Recreatable with `create extension vector`.
drop extension vector;
