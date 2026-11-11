-- One call = one transaction: a document's old chunks go and the new ones come in
-- together, so an interrupted re-chunk never leaves a document empty or
-- half-replaced, and re-running it is safe (ai-provider REQ §5.7). The caller
-- passes the hash of the chunks it checked; they are compared under a lock on the
-- document, so a write since the check fails the call instead of being lost.
create or replace function public.replace_document_chunks(p_document_id text, p_expected_sha256 text, p_chunks jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  inserted integer;
  current_sha256 text;
begin
  perform 1 from documents where id = p_document_id for update;
  if not found then
    raise exception 'document % not found', p_document_id;
  end if;
  perform 1 from document_chunks where document_id = p_document_id for update;

  -- Same as chunksSha256 in scripts/rechunk-documents.ts.
  select encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(content, 'UTF8')), 'hex'), ',' order by chunk_index), ''), 'UTF8')), 'hex')
    into current_sha256
    from document_chunks where document_id = p_document_id;
  if current_sha256 is distinct from p_expected_sha256 then
    raise exception 'chunks of document % changed since the check', p_document_id;
  end if;
  if jsonb_typeof(p_chunks) <> 'array' or jsonb_array_length(p_chunks) = 0 then
    raise exception 'no chunks for document %', p_document_id;
  end if;

  delete from document_chunks where document_id = p_document_id;

  insert into document_chunks (id, document_id, chunk_index, content, chunk_type, section_title, section_level, section_path)
  select gen_random_uuid()::text,
         p_document_id,
         (c.ordinality - 1)::integer,
         c.value->>'content',
         'general',
         c.value->>'section_title',
         coalesce((c.value->>'section_level')::integer, 0),
         case when c.value ? 'section_path'
              then array(select jsonb_array_elements_text(c.value->'section_path'))
         end
  from jsonb_array_elements(p_chunks) with ordinality c;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

-- Only the re-chunk script (service_role) calls it.
revoke execute on function public.replace_document_chunks(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_document_chunks(text, text, jsonb) to service_role;
