-- REQ §5.8: search is keyword-only since v4.7.0, verified in production, so the
-- vector column and the functions that read it go. Irreversible: the embeddings
-- are not regenerated. The backup schema held the v4.6 articles for rollback
-- before the re-split (REQ §5.6); the original files and the old splitter in git
-- can rebuild it.
drop function public.match_documents(vector, integer, text[]);
drop function public.search_documents_hybrid(vector, text, integer, text, integer, text, double precision, double precision);
drop function public.search_regulations_hybrid(text[], vector, integer);
alter table public.document_chunks drop column embedding;
drop table backup.structured_regulations_v4_6;
drop schema backup;
