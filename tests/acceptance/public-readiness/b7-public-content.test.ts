// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md §5.3 (batch B7).
// §no-internals reads its path list from the private file under GOODMAN_DATA_DIR:
// the list is the very thing kept out of the repository.

describe('B7 public content', () => {
  it.todo('§no-license there is no LICENSE file, package.json says UNLICENSED and README states all rights reserved');
  it.todo('§no-internals no tracked file contains a VPS deployment path from the private list');
  it.todo('§no-personal-email no tracked file contains a personal email address; the security contact is GitHub private vulnerability reporting');
});
