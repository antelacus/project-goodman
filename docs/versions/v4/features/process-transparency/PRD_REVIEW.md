# v4.0 Phase 1 PRD Review

**Date:** 2026-01-07
**Target Document:** `docs/versions/v4/features/process-transparency/PHASE1_PRD.md`
**Status:** ✅ Feedback Incorporated (2026-01-07)

---

## Review Resolution Summary

| Recommendation | Status | PRD Section Updated |
|----------------|--------|---------------------|
| SSE Streaming Architecture | ✅ Adopted | §4, §5.1, §5.3 |
| Event Humanization | ✅ Adopted | §3.3 (new section) |
| Page-level Granularity | ✅ Deferred to v4.x | §5.2 |
| Error Display Strategy | ✅ Adopted | §3.4.4 (new section) |
| UUID for Event IDs | ✅ Adopted | §3.2 |

---

## Original Review (Archived)

## Executive Summary

The PRD correctly identifies a critical gap in professional AI agents: **trust and transparency**. "Black box" answers are insufficient for financial workflows. The proposed "Transparency-First" strategy is excellent.

However, the **technical implementation strategy (Synchronous Response)** needs adjustment to match modern best practices and the existing capabilities of Project Goodman (specifically the SSE streaming infrastructure).

## Critical Recommendations

### 1. Shift from Synchronous to Streaming Architecture (Critical)

**Current PRD (Section 5.3):** "Synchronous response... Process events returned with API response."
**Issue:** Waiting for the entire chain of thought, tool calls, and calculations to finish before showing *anything* to the user creates a poor "loading spinner" experience. For complex financial analysis, this could take 10-30 seconds.
**Recommendation:**
Leverage the **Server-Sent Events (SSE)** endpoint (`/api/chat/stream`) you implemented in v3.6.

- Stream `thinking`, `tool_call`, and `log` events **in real-time** as they happen.
- This creates a "working with you" feel rather than a "waiting for you" feel.
- The `ProcessLog` component should update live, appending steps as they arrive.

### 2. Strengthen Data Source Granularity

**Current PRD:** "Source: 2024 Balance Sheet [View Original]"
**Recommendation:**
Where possible, increase granularity. If the extraction tool supports it (e.g., using a vector store with chunk metadata or a coordinate-based PDF parser), try to provide:

- **Page Numbers**: "Page 14 of 2024 Balance Sheet"
- **Snippet Preview**: Hovering over the link could show the 2-3 lines of context around the extracted number.
*Note: If this is too complex for Phase 1, explicitly mark "Page-level deep linking" as a Phase 2 item.*

### 3. Refine "Thinking" vs. "Tool" Events

**dilemma:** Users don't need to see raw JSON.
**Recommendation:**
Ensure the mapping from LangGraph events to UI events is aggressively "humanized".

- **Raw:** `FunctionCall: query_vector_store({ query: "current assets", filter: { year: 2024 } })`
- **Humanized:** "Searching specific document for 'current assets' (2024)..."
- Define a strict `Formatter` layer in the backend to sanitize technical event logs into user-friendly strings before sending them to the frontend.

## Minor Suggestions

- **Event ID**: Ensure `ProcessEvent` IDs are unique enough to handle list rendering (keys) in React without conflicts. UUIDs recommended.
- **Error Handling**: Section 7 mentions "Graceful degradation". Explicitly define how an error *inside* a tool (e.g., "API Timeout") is displayed in the process log versus the main chat bubble. Usually, it's best to show the red "X" in the process log but a friendly "I ran into an issue..." in the main chat.
