// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id.
// A batch writes its bodies first (red), then builds until they pass; the version
// cannot close while a todo is left here. Criteria that need the relay or the real
// database are asserted elsewhere:
//   §retrieval-quality and the eval half of §out-of-library — scripts/eval-retrieval.ts
//   §keyword-match, §doc-search — supabase/tests/*.sql (transaction, rolled back)
//   §reg-integrity on the 45 real documents — scripts/resplit-regulations.ts
//   §vector-removed — Phase 6 schema check

describe('B1 AI entry point', () => {
  it.todo('§relay-model every AI purpose resolves to gpt-6.1-sol');
  it.todo('§relay-params Chat Completions sends max_completion_tokens, Responses sends max_output_tokens; neither sends max_tokens or temperature');
  it.todo('§system-prompt every Chat Completions call starts with a non-empty system message; every Responses call has non-empty instructions');
  it.todo('§ai-outcome length, refusal, content_filter, blank text and schema-invalid JSON fail; a tool-calls-only reply succeeds');
  it.todo('§ai-timeout a relay that never answers fails within the purpose time limit');
});

describe('B2 failures are shown, never fabricated', () => {
  it.todo('§report-section-failure a failed section keeps its metrics table and shows the failure text; no fallback analysis anywhere in the report');
  it.todo('§report-summary-failure a failed section or a failed summary call yields "摘要未生成" with empty key findings');
  it.todo('§chat-failure an AI failure in chat reaches the user as "AI 服务暂时不可用，请稍后再试"');
  it.todo('§extract-failure an extraction failure, or a second period failing validation, fails both upload routes and writes no financial_data rows');
  it.todo('§smoke-report the staging smoke check fails when any report section failed');
});

describe('B3 regulation re-split', () => {
  it.todo('§reg-split-rule an in-text "按照本准则第X条的规定" does not start a new article');
  it.todo('§reg-integrity articles are consecutive with no duplicates, page count matches, and no body line is left unassigned');
  it.todo('§reg-upload-dup an admin upload whose split repeats an article number fails and writes no articles');
  it.todo('§reg-upload-storage an admin regulation upload whose file storage fails writes no document and no articles');
});

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
