// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md §5.4, §5.5, §5.7 as changed in
// v4.8.0 (docs/features/public-readiness/TRACK.md, batch B4; B5 is in b10-chunks.test.ts). The §citation-text
// and §out-of-library cases in b4-search-citations.test.ts that expect a removed sentence
// and a closing notice change with B4.

describe('B4 user-document citations and the deletion marker', () => {
  it.todo('§citation-text an unverified article number, unknown id or added paragraph is replaced in place by 〔未经核实的引用，已删去〕 and the rest of the sentence stays');
  it.todo('§user-doc-citation a [Dn] citation of a selected document shows as 《name》（您上传的文档）第X条 with a link to that document; a self-written 会计准则第五条 is removed even though the document has a 第五条');
  it.todo('§user-doc-duplicate article numbers repeated within one document get no id and their citations are removed; the other articles of that document cite normally');
  it.todo('§removal-count the number of removed places is a process-log event; the answer has no closing notice');
  it.todo('§doc-article-hint an admin upload of a non-regulation knowledge document with line-start 第X条 returns the hint; one without does not');
  it.todo('§out-of-library an answer that cites only a selected document after a regulation search carries the out-of-library label');
  it.todo('§selected-doc-owner a documentId owned by someone else, or a knowledge-library document, is not read and reports a document load error; the requester\'s own document is read');
});
