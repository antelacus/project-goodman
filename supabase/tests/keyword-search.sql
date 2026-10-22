-- §keyword-match, §doc-search and §doc-search-no-regulation (REQ §5.3, §5.7), and
-- the per-document cap on document search (DESIGN §5), against the real search
-- functions. Synthetic rows only, inside one transaction that is rolled back:
-- run through the Supabase MCP (execute_sql); a failed assertion raises.
begin;

insert into documents (id, name, doc_category, doc_type, status, size) values
  ('test-kw-knowledge', '合成资料库文档.pdf', 'knowledge', 'policy', 'ready', 1),
  ('test-kw-business', '合成用户上传.pdf', 'business', 'general', 'ready', 1),
  ('test-kw-pending', '合成未就绪文档.pdf', 'knowledge', 'policy', 'processing', 1),
  ('test-kw-regulation', '合成准则.pdf', 'knowledge', 'accounting_standard', 'ready', 1),
  ('test-kw-law', '合成法律.pdf', 'knowledge', 'regulation', 'ready', 1),
  ('test-kw-report', '合成年报.pdf', 'knowledge', 'financial_report', 'ready', 1),
  ('test-kw-policy', '合成制度.md', 'knowledge', 'policy', 'ready', 1);

-- The two keywords sit far apart, across a line break, and one is written with
-- a Kangxi radical, as some PDFs print it.
insert into structured_regulations (document_id, regulation_name, article_number, content) values
  ('test-kw-regulation', '合成准则', '第一条', E'第一条 企业持有的合成金融资产应当分类。\n其后各期按照本准则计提合成减值准备。'),
  ('test-kw-regulation', '合成准则', '第二条', '第二条 本条只提到合成金融资产。');

insert into document_chunks (id, document_id, chunk_index, content) values
  ('test-kw-c1', 'test-kw-knowledge', 0, E'合成差旅报销标准：\n高铁二等座。'),
  ('test-kw-c2', 'test-kw-business', 0, '合成差旅报销标准：用户自己的文档。'),
  ('test-kw-c3', 'test-kw-pending', 0, '合成差旅报销标准：尚未就绪的文档。'),
  ('test-kw-c4', 'test-kw-regulation', 0, '合成差旅报销标准：准则原文的切块。'),
  ('test-kw-c5', 'test-kw-law', 0, '合成差旅报销标准：法律原文的切块。'),
  -- The report's chunks repeat the word, so by score alone all three outrank the policy.
  ('test-kw-r1', 'test-kw-report', 0, '合成坏账 合成坏账 合成坏账 附注表格一'),
  ('test-kw-r2', 'test-kw-report', 1, '合成坏账 合成坏账 合成坏账 附注表格二'),
  ('test-kw-r3', 'test-kw-report', 2, '合成坏账 合成坏账 合成坏账 附注表格三'),
  ('test-kw-p1', 'test-kw-policy', 0, '合成坏账计提比例：六至十二个月百分之五。');

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

  -- §doc-search: only the ready knowledge document is returned; regulation text
  -- is not, even when the regulation's type is asked for (§doc-search-no-regulation).
  select array_agg(document_id) into hits
  from search_knowledge_chunks(array['合成差旅'], 10)
  where document_id like 'test-kw-%';
  if hits is distinct from array['test-kw-knowledge'] then
    raise exception '§doc-search failed: %', hits;
  end if;

  if exists (select 1 from search_knowledge_chunks(array['合成差旅'], 10, null, array['accounting_standard', 'regulation'])
             where document_id like 'test-kw-%') then
    raise exception '§doc-search-no-regulation failed: regulation chunks returned';
  end if;

  -- At most 2 chunks per document, so the policy reaches the top 3.
  select array_agg(document_id order by ordinality) into hits
  from search_knowledge_chunks(array['合成坏账'], 3) with ordinality;
  if hits is distinct from array['test-kw-report', 'test-kw-report', 'test-kw-policy'] then
    raise exception 'per-document cap failed: %', hits;
  end if;

  raise notice 'keyword-search: all assertions passed';
end $$;

select 'keyword-search: all assertions passed' as result;
rollback;
