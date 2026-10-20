-- §keyword-match and §doc-search (REQ §5.3, §5.7), against the real search
-- functions. Synthetic rows only, inside one transaction that is rolled back:
-- run through the Supabase MCP (execute_sql); a failed assertion raises.
begin;

insert into documents (id, name, doc_category, doc_type, status, size) values
  ('test-kw-knowledge', '合成资料库文档.pdf', 'knowledge', 'policy', 'ready', 1),
  ('test-kw-business', '合成用户上传.pdf', 'business', 'general', 'ready', 1),
  ('test-kw-pending', '合成未就绪文档.pdf', 'knowledge', 'policy', 'processing', 1),
  ('test-kw-regulation', '合成准则.pdf', 'knowledge', 'accounting_standard', 'ready', 1);

-- The two keywords sit far apart, across a line break, and one is written with
-- a Kangxi radical, as some PDFs print it.
insert into structured_regulations (document_id, regulation_name, article_number, content) values
  ('test-kw-regulation', '合成准则', '第一条', E'第一条 企业持有的合成金融资产应当分类。\n其后各期按照本准则计提合成减值准备。'),
  ('test-kw-regulation', '合成准则', '第二条', '第二条 本条只提到合成金融资产。');

insert into document_chunks (id, document_id, chunk_index, content) values
  ('test-kw-c1', 'test-kw-knowledge', 0, E'合成差旅报销标准：\n高铁二等座。'),
  ('test-kw-c2', 'test-kw-business', 0, '合成差旅报销标准：用户自己的文档。'),
  ('test-kw-c3', 'test-kw-pending', 0, '合成差旅报销标准：尚未就绪的文档。');

do $$
declare
  hits text[];
begin
  -- §keyword-match: non-adjacent keywords match, and the article with both ranks first.
  select array_agg(article_number order by ordinality) into hits
  from search_regulation_articles(array['合成金融资产', '合成减值'], 5) with ordinality
  where document_id = 'test-kw-regulation';
  if hits is distinct from array['第一条', '第二条'] then
    raise exception '§keyword-match failed: %', hits;
  end if;

  -- Kangxi radical in the keyword ("⾦" for "金") still matches.
  if not exists (select 1 from search_regulation_articles(array['合成⾦融资产'], 5) where document_id = 'test-kw-regulation') then
    raise exception '§keyword-match failed: Kangxi keyword did not match';
  end if;

  -- §doc-search: only the ready knowledge document is returned.
  select array_agg(document_id) into hits
  from search_knowledge_chunks(array['合成差旅'], 10)
  where document_id like 'test-kw-%';
  if hits is distinct from array['test-kw-knowledge'] then
    raise exception '§doc-search failed: %', hits;
  end if;

  raise notice 'keyword-search: all assertions passed';
end $$;

select 'keyword-search: all assertions passed' as result;
rollback;
