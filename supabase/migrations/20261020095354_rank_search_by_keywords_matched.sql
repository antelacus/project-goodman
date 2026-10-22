-- Ranking is by how many distinct keywords a row contains, then TF-IDF: by
-- TF-IDF alone, a row repeating one keyword outranks one containing all of them.
create or replace function public.search_regulation_articles(p_keywords text[], p_limit integer default 5)
returns table (
  id uuid,
  document_id text,
  regulation_name varchar,
  article_number varchar,
  content text,
  file_url text,
  score double precision
)
language sql
stable
set search_path = public, extensions
set enable_seqscan = off
as $$
  select r.id, r.document_id, r.regulation_name, r.article_number, r.content, d.file_url,
         pgroonga_score(r.tableoid, r.ctid) as score
  from structured_regulations r
  join documents d on d.id = r.document_id
  where d.status = 'ready'
    and r.search_text &@~ pgroonga_condition(
      (select string_agg(pgroonga_query_escape(public.search_normalize(k)), ' OR ')
         from unnest(p_keywords) k
        where length(public.search_normalize(k)) >= 2),
      scorers => array['scorer_tf_idf($index)'],
      index_name => 'idx_structured_regulations_search_text')
  order by (select count(*) from unnest(p_keywords) k
             where length(public.search_normalize(k)) >= 2
               and position(public.search_normalize(k) in r.search_text) > 0) desc,
           score desc, r.document_id, r.article_number
  limit least(greatest(p_limit, 1), 20)
$$;

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
  select c.id, c.document_id, d.name, d.doc_type, d.year, d.file_url, c.section_title, c.content,
         pgroonga_score(c.tableoid, c.ctid) as score
  from document_chunks c
  join documents d on d.id = c.document_id
  where d.doc_category = 'knowledge'
    and d.status = 'ready'
    and (p_year is null or d.year = p_year)
    and (p_doc_types is null or d.doc_type = any(p_doc_types))
    and c.search_text &@~ pgroonga_condition(
      (select string_agg(pgroonga_query_escape(public.search_normalize(k)), ' OR ')
         from unnest(p_keywords) k
        where length(public.search_normalize(k)) >= 2),
      scorers => array['scorer_tf_idf($index)'],
      index_name => 'idx_document_chunks_search_text')
  order by (select count(*) from unnest(p_keywords) k
             where length(public.search_normalize(k)) >= 2
               and position(public.search_normalize(k) in c.search_text) > 0) desc,
           score desc, c.document_id, c.chunk_index
  limit least(greatest(p_limit, 1), 20)
$$;
