-- One call = one transaction: the document's old articles go and the new ones
-- come in together, so an interrupted re-split never leaves a document empty or
-- half-replaced, and re-running it is safe (REQ §5.6).
create or replace function public.replace_regulation_articles(p_document_id text, p_articles jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  inserted integer;
  repeated text;
begin
  if not exists (select 1 from documents where id = p_document_id) then
    raise exception 'document % not found', p_document_id;
  end if;
  if jsonb_typeof(p_articles) <> 'array' or jsonb_array_length(p_articles) = 0 then
    raise exception 'no articles for document %', p_document_id;
  end if;
  select a->>'article_number' into repeated
  from jsonb_array_elements(p_articles) a
  group by a->>'article_number'
  having count(*) > 1
  limit 1;
  if repeated is not null then
    raise exception 'article % repeated for document %', repeated, p_document_id;
  end if;

  delete from structured_regulations where document_id = p_document_id;

  insert into structured_regulations (document_id, regulation_name, article_number, content, keywords, hierarchy, metadata)
  select p_document_id,
         a->>'regulation_name',
         a->>'article_number',
         a->>'content',
         '{}',
         coalesce(a->'hierarchy', '[]'::jsonb),
         coalesce(a->'metadata', '{}'::jsonb)
  from jsonb_array_elements(p_articles) a;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Only the re-split script (service_role) calls it.
revoke execute on function public.replace_regulation_articles(text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_regulation_articles(text, jsonb) to service_role;
