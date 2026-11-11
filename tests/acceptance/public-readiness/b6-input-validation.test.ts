// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md §5.2 (batch B6).

describe('B6 input validation and document access', () => {
  it.todo('§doc-access preview-url and extract_document read knowledge documents and the requester\'s own; someone else\'s is 404 / a failure without reading it; a fileUrl preview request is rejected');
  it.todo('§input-validation preview-url, sessions/[id] and admin upload-database-document each answer an invalid input with 400 and the standard error shape, without touching the database');
});
