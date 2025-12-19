# Implementation Plan - Intelligent Document System (V3.3 Phase 2)

This plan implements the "Auto-Discovery + User Override" document selection system, replacing the current manual-only approach.

## User Review Required

> [!IMPORTANT]
> **Database Schema Changes**: This plan adds columns to `document_chunks` and `documents`. It also **deprecates** the unused `hierarchy` (JSONB) column in favor of `section_path` (TEXT[]). This is non-breaking but significant.

> [!NOTE]
> **Search Logic**: We are introducing a **Hybrid Search with RRF Fusion** (Vector + Keyword) in the database layer. This replaces the simple Vector search for "Knowledge" documents.

## Proposed Changes

### Database Layer

#### [NEW] `supabase/migrations/20250120000000_add_intelligent_search.sql`

- Add columns: `section_title`, `section_level`, `section_path` to `document_chunks`.
- Add columns: `section_structure`, `structure_quality` to `documents`.
- Create function: `search_documents_hybrid` (RPC) implementing Vector + Keyword recall and RRF scoring.
- Create indexes: GIN indexes for `section_path` and `to_tsvector`.

### Core Modules (`src/lib`)

#### [NEW] `src/lib/section-parser.ts`

- Logic to parse TOC and Regex-based headings from document text.

#### [NEW] `src/lib/section-aware-chunker.ts`

- Logic to split text into chunks while attaching section metadata.

#### [NEW] `src/lib/document-search.ts`

- TypeScript wrapper for the `search_documents_hybrid` RPC.

#### [NEW] `src/lib/document-selector.ts` & `src/lib/workflows/shared/document-selection.ts`

- Domain logic to analyze query intent and select best docs.

### API Layer (`src/app/api`)

#### [NEW] `src/app/api/document-search/route.ts`

- New endpoint for standalone search testing and frontend use.

#### [MODIFY] `src/app/api/documents/route.ts` (or upload handler)

- Integrate `section-parser` to analyze structure during upload.

### Workflow Integration (`src/lib/workflows`)

#### [MODIFY] `src/lib/types/workflow-states.ts` & `src/lib/types/domain-types.ts`

- Extend `FinancialAnalysisState` and `GuidanceChatState` to include `documentSelection` field.
- Define `DocumentSelectionState` matching `DocumentSelectionResult`.

#### [NEW] `src/lib/workflows/shared/document-selection.ts`

- Implement `performDocumentSelection(state)`:
  - Supports "Override Mode": checks if `input.documentSelection` is present.
  - Supports "Auto Mode": calls `selectDocumentsForQuery`.
  - Merges results into state.

#### [MODIFY] `src/lib/workflows/financial-analysis/steps.ts`

- Inject `performDocumentSelection` step before `queryData`.
- Update `queryData` to use selected documents instead of raw input `documentIds`.

#### [MODIFY] `src/lib/workflows/guidance-chat/steps.ts`

- Inject `performDocumentSelection` step before/as part of `performHybridSearch`.
- Update search logic to prioritize selected documents.

### Frontend Components (`src/components`)

#### [NEW] `src/components/document-selection/DocumentSourceDisplay.tsx`

- UI to show selected docs and relevance scores.

#### [NEW] `src/components/document-selection/DocumentSelectionModal.tsx`

- Modal for user override.

## Verification Plan

### Automated Tests

- **Section Parsing**: Create a test script `scripts/test-section-parser.ts` with sample text inputs (TOC style, Heading style) and assert structure output.
- **Hybrid Search**: Create a test script `scripts/test-hybrid-search.ts` that inserts dummy chunks and queries them via the RPC to verify RRF ranking.

### Manual Verification

1. **Upload Flow**:
    - Upload a PDF (e.g., "Non-current Assets Loan Inspection Report").
    - Check Network tab for `structureResult` in response.
    - Verify `UploadFeedback` UI appears.
2. **Analysis Flow**:
    - Go to Financial Analysis.
    - Input: "2024年货币资金情况如何？"
    - Verify "Sources" logs/UI shows auto-selected documents.
    - Click "Modify Selection", uncheck one document, confirm.
    - Verify the answer regenerates using the new selection.
