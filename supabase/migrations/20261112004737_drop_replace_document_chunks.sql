-- The one-off re-chunk (v4.8.0) was its only caller; uploads write chunks directly.
drop function if exists public.replace_document_chunks(text, text, jsonb);
