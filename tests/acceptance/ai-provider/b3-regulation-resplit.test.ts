// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.
// Asserted elsewhere: §reg-integrity on the 45 real documents — scripts/resplit-regulations.ts

describe('B3 regulation re-split', () => {
  it.todo('§reg-split-rule an in-text "按照本准则第X条的规定" does not start a new article');
  it.todo('§reg-integrity articles are consecutive with no duplicates, page count matches, and no body line is left unassigned');
  it.todo('§reg-upload-dup an admin upload whose split repeats an article number fails and writes no articles');
  it.todo('§reg-upload-storage an admin regulation upload whose file storage fails writes no document and no articles');
});
