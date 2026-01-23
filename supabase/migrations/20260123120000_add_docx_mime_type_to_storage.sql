-- Migration: Allow DOCX uploads in storage bucket
-- Purpose: Permit report DOCX export uploads to document-files bucket

update storage.buckets
set allowed_mime_types = array_append(
  allowed_mime_types,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
)
where id = 'document-files'
  and not (allowed_mime_types @> array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
