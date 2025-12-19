# Task: Implement Intelligent Document System (V3.3 Phase 2)

- [x] **Phase A: Database & Core Modules** <!-- id: 0 -->
  - [x] Create DB Migration: Add `section_title`, `section_path` (text[]), `section_level` to `document_chunks`; Add `section_structure` to `documents`. <!-- id: 1 -->
  - [x] Create DB Controller Function: `search_documents_hybrid` (RPC) with RRF logic. <!-- id: 2 -->
  - [x] Implement `src/lib/section-parser.ts`: Table of Contents & Heading Regex parser. <!-- id: 3 -->
  - [x] Implement `src/lib/section-aware-chunker.ts`: Logic to split text preserving section metadata. <!-- id: 4 -->
  - [x] Implement `src/lib/document-search.ts`: TS wrapper for the hybrid search RPC. <!-- id: 5 -->

- [x] **Phase B: API Layer** <!-- id: 6 -->
  - [x] Create API Route: `POST /api/document-search` (Validation + Controller Call). <!-- id: 7 -->
  - [x] Update API Route: `POST /api/documents` to trigger section parsing on upload and store results. <!-- id: 8 -->
  - [x] Implement `src/lib/query-intent.ts`: Intent analysis (Keywords + Year extraction). <!-- id: 9 -->
  - [x] Implement `src/lib/document-selector.ts`: Auto-selection logic (Top-N + filtering). <!-- id: 10 -->

- [ ] **Phase C: Workflow Integration** <!-- id: 11 -->
  - [ ] Create `src/lib/workflows/shared/document-selection.ts`: Reusable workflow step. <!-- id: 12 -->
  - [ ] Integrate into `financial-analysis` workflow. <!-- id: 13 -->
  - [ ] Integrate into `guidance-chat` workflow. <!-- id: 14 -->

- [ ] **Phase D: Frontend Implementation** <!-- id: 15 -->
  - [ ] Create Component: `DocumentSourceDisplay.tsx`. <!-- id: 16 -->
  - [ ] Create Component: `DocumentSelectionModal.tsx`. <!-- id: 17 -->
  - [ ] Create Component: `UploadFeedback.tsx`. <!-- id: 18 -->
  - [ ] Integrate UI into Financial Analysis page. <!-- id: 19 -->

- [ ] **Phase E: Verification** <!-- id: 20 -->
  - [ ] Manual Test: Upload a financial report PDF and verify "Structure Analysis" feedback. <!-- id: 21 -->
  - [ ] Manual Test: Ask a question (e.g. "2023 货币资金") and verify Source Display shows correct automated selection. <!-- id: 22 -->
  - [ ] Manual Test: Open "Modify Selection" and override documents, verifying the answer regenerates. <!-- id: 23 -->
  - [x] Run `tests/integration/hybrid-search.test.ts` (Integration Test). <!-- id: 7 -->
  - [x] Create `walkthrough.md`. <!-- id: 8 -->
