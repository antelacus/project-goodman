-- At most 2 chunks per document: the annual report has ten times the chunks of
-- any other document, and its figure tables contain the same accounting terms,
-- so uncapped it fills the top results and pushes the company's own policies out.
create or replace function public.search_knowledge_chunks(
  p_keywords text[],
  p_limit integer default 5,
  p_year text default null,
  p_doc_types text[] default null
)
returns table (
  chunk_id text,
  document_id text,
  document_name text,
  doc_type text,
  year varchar,
  file_url text,
  section_title text,
  content text,
  score double precision
)
language sql
stable
set search_path = public, extensions
set enable_seqscan = off
as $$
  select ranked.chunk_id, ranked.document_id, ranked.document_name, ranked.doc_type, ranked.year,
         ranked.file_url, ranked.section_title, ranked.content, ranked.score
  from (
    select matched.*,
           row_number() over (partition by matched.document_id
                              order by matched.keywords_matched desc, matched.score desc, matched.chunk_index) as rank_in_document
    from (
      select c.id as chunk_id, c.document_id, d.name as document_name, d.doc_type, d.year, d.file_url,
             c.section_title, c.content, c.chunk_index,
             pgroonga_score(c.tableoid, c.ctid) as score,
             (select count(*) from unnest(p_keywords) k
               where length(public.search_normalize(k)) >= 2
                 and position(public.search_normalize(k) in c.search_text) > 0) as keywords_matched
      from document_chunks c
      join documents d on d.id = c.document_id
      where d.doc_category = 'knowledge'
        and d.status = 'ready'
        and d.doc_type is distinct from 'regulation'
        and d.doc_type is distinct from 'accounting_standard'
        and (p_year is null or d.year = p_year)
        and (p_doc_types is null or d.doc_type = any(p_doc_types))
        and c.search_text &@~ pgroonga_condition(
          (select string_agg(pgroonga_query_escape(public.search_normalize(k)), ' OR ')
             from unnest(p_keywords) k
            where length(public.search_normalize(k)) >= 2),
          scorers => array['scorer_tf_idf($index)'],
          index_name => 'idx_document_chunks_search_text')
    ) matched
  ) ranked
  where ranked.rank_in_document <= 2
  order by ranked.keywords_matched desc, ranked.score desc, ranked.document_id, ranked.chunk_index
  limit least(greatest(p_limit, 1), 20)
$$;
