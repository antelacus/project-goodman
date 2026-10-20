// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.
// Asserted elsewhere: §keyword-match, §doc-search — supabase/tests/*.sql (transaction,
// rolled back); §retrieval-quality and the eval half of §out-of-library —
// scripts/eval-retrieval.ts (B5); §vector-removed — Phase 6 schema check.

describe('B4 keyword search and citations', () => {
  it.todo('§reg-search-citation every regulation search result has a regulation name, article number and source document id');
  it.todo('§search-rounds the 4th search returns budget_exhausted without searching, the answer turn offers no tools, and saved history has no unpaired tool call');
  it.todo('§citation-text every article number sent to the user comes from this question\'s evidence; self-written numbers and unknown ids are removed with a notice');
  it.todo('§citation-link a regulation search event links to the preview of the article source file');
  it.todo('§out-of-library an answer without a valid evidence id after a regulation search starts with the out-of-library label and has no article numbers');
  it.todo('§retrieval-error when every search of the question errored, the label is the retrieval-failure one');
  it.todo('§upload-no-embedding a user upload succeeds, writes chunks, makes no embedding call, and its content reaches the model when selected');
  it.todo('§no-embedding-calls src/ has no embedding API call or embedding model config');
});
