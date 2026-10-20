// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id.
// A batch writes its bodies first (red), then builds until they pass; the version
// cannot close while a todo is left here. Criteria that need the relay or the real
// knowledge base are asserted by scripts, not here: §retrieval-quality,
// §citation-text, §out-of-library, §doc-search (scripts/eval-retrieval.ts),
// §reg-integrity on the 45 real documents (scripts/resplit-regulations.ts),
// §vector-removed (Phase 6 schema check).

describe('B1 AI entry point', () => {
  it.todo('§relay-model every AI purpose resolves to gpt-6.1-sol');
  it.todo('§relay-params no AI request carries max_tokens or temperature');
  it.todo('§system-prompt every Chat Completions call starts with a non-empty system message; every Responses call has non-empty instructions');
});

describe('B2 failures are shown, never fabricated', () => {
  it.todo('§report-section-failure a failed section keeps its metrics table and shows the failure text; no fallback analysis anywhere in the report');
  it.todo('§report-summary-failure a failed section or a failed summary call yields "摘要未生成" with empty key findings');
  it.todo('§chat-failure an AI failure in chat reaches the user as "AI 服务暂时不可用，请稍后再试"');
  it.todo('§extract-failure an extraction AI failure fails the upload and writes no financial_data rows');
  it.todo('§smoke-report the staging smoke check fails when any report section failed');
});

describe('B3 regulation re-split', () => {
  it.todo('§reg-split-rule an in-text "按照本准则第X条的规定" does not start a new article');
  it.todo('§reg-integrity split articles are strictly sequential with no duplicates and together cover the body text');
  it.todo('§reg-upload-dup an admin upload whose split repeats an article number fails and writes no articles');
});

describe('B4 keyword search', () => {
  it.todo('§reg-search-citation every regulation search result has a regulation name, article number and source document id');
  it.todo('§search-rounds a question executes at most 3 searches; the 4th returns the budget-exhausted result without searching');
  it.todo('§citation-link a regulation search event in the process log links to the article source document preview');
  it.todo('§upload-no-embedding a user upload succeeds, writes chunks, makes no embedding call, and its content reaches the model when selected');
  it.todo('§no-embedding-calls src/ has no embedding API call or embedding model config');
});
