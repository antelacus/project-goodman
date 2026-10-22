-- Keyword search over regulation articles and knowledge chunks (REQ §5.3, §5.7).
--
-- search_text is what PGroonga indexes: the content with Kangxi radicals mapped
-- to the ideographs they render as ("纳税⼈" → "纳税人") and every whitespace
-- removed, since PDF text breaks lines (and justified lines space characters)
-- inside words. PGroonga splits non-ASCII text into character bigrams.
-- Additive only: the vector columns and functions go in Phase 6.

create extension if not exists pgroonga with schema extensions;

create or replace function public.search_normalize(t text)
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select regexp_replace(translate(t, '⺟⻳⼀⼁⼂⼃⼄⼅⼆⼇⼈⼉⼊⼋⼌⼍⼎⼏⼐⼑⼒⼓⼔⼕⼖⼗⼘⼙⼚⼛⼜⼝⼞⼟⼠⼡⼢⼣⼤⼥⼦⼧⼨⼩⼪⼫⼬⼭⼮⼯⼰⼱⼲⼳⼴⼵⼶⼷⼸⼹⼺⼻⼼⼽⼾⼿⽀⽁⽂⽃⽄⽅⽆⽇⽈⽉⽊⽋⽌⽍⽎⽏⽐⽑⽒⽓⽔⽕⽖⽗⽘⽙⽚⽛⽜⽝⽞⽟⽠⽡⽢⽣⽤⽥⽦⽧⽨⽩⽪⽫⽬⽭⽮⽯⽰⽱⽲⽳⽴⽵⽶⽷⽸⽹⽺⽻⽼⽽⽾⽿⾀⾁⾂⾃⾄⾅⾆⾇⾈⾉⾊⾋⾌⾍⾎⾏⾐⾑⾒⾓⾔⾕⾖⾗⾘⾙⾚⾛⾜⾝⾞⾟⾠⾡⾢⾣⾤⾥⾦⾧⾨⾩⾪⾫⾬⾭⾮⾯⾰⾱⾲⾳⾴⾵⾶⾷⾸⾹⾺⾻⾼⾽⾾⾿⿀⿁⿂⿃⿄⿅⿆⿇⿈⿉⿊⿋⿌⿍⿎⿏⿐⿑⿒⿓⿔⿕', '母龟一丨丶丿乙亅二亠人儿入八冂冖冫几凵刀力勹匕匚匸十卜卩厂厶又口囗土士夂夊夕大女子宀寸小尢尸屮山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舛舟艮色艸虍虫血行衣襾見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里金長門阜隶隹雨靑非面革韋韭音頁風飛食首香馬骨高髟鬥鬯鬲鬼魚鳥鹵鹿麥麻黃黍黑黹黽鼎鼓鼠鼻齊齒龍龜龠'), '\s+', '', 'g')
$$;

alter table public.structured_regulations
  add column if not exists search_text text generated always as (public.search_normalize(content)) stored;
alter table public.document_chunks
  add column if not exists search_text text generated always as (public.search_normalize(content)) stored;

create index if not exists idx_structured_regulations_search_text
  on public.structured_regulations using pgroonga (search_text);
create index if not exists idx_document_chunks_search_text
  on public.document_chunks using pgroonga (search_text);

-- Keywords are combined with OR and ranked by TF-IDF, so an article matching
-- more and rarer keywords ranks higher. Each keyword is escaped: the agent's
-- words are never query syntax. Scores come from the index, hence seqscan off.
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
  order by score desc, r.document_id, r.article_number
  limit least(greatest(p_limit, 1), 20)
$$;

-- The knowledge-library scope (ready knowledge documents only) is fixed here,
-- not a parameter: user uploads never enter search (REQ §5.7).
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
  order by score desc, c.document_id, c.chunk_index
  limit least(greatest(p_limit, 1), 20)
$$;
