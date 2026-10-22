-- REQ §5.8: no column uses the vector type since 20261022073400, and search is
-- keyword-only. To bring it back, `create extension vector with schema extensions;`:
-- without the schema it lands in public, which the Data API exposes.
drop extension vector;
