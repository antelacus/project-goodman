/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { saveMemoryNode } from "@/lib/workflows/core/nodes/save-memory";
import { conversationMemory } from "@/lib/memory/conversation-memory";
import { generateSessionTitle } from "@/lib/memory/session-title";
import type { BaseAgentState } from "@/lib/workflows/core/state/base-state";

vi.mock("@/lib/memory/conversation-memory", () => ({
  conversationMemory: {
    saveMessages: vi.fn(),
    getSessionTitle: vi.fn(),
    updateSessionTitle: vi.fn(),
  },
}));

vi.mock("@/lib/memory/session-title", () => ({
  generateSessionTitle: vi.fn(),
}));

function buildState(): BaseAgentState {
  return {
    input: {
      question: "分析这份报表",
    },
    agent: {
      sessionId: "session-1",
      messages: [
        new SystemMessage("[Active Document Context]"),
        new HumanMessage("分析这份报表"),
        new AIMessage("好的，正在分析。"),
      ],
      currentIteration: 1,
      maxIterations: 10,
      initialMessageCount: 1,
      isComplete: true,
      pendingToolCalls: [],
    },
    toolResults: [],
  };
}

describe("saveMemoryNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a session title even when initial messages already exist", async () => {
    const state = buildState();

    vi.mocked(conversationMemory.saveMessages).mockResolvedValue(undefined);
    vi.mocked(conversationMemory.getSessionTitle).mockResolvedValue(null);
    vi.mocked(conversationMemory.updateSessionTitle).mockResolvedValue(undefined);
    vi.mocked(generateSessionTitle).mockResolvedValue("报表分析");

    await saveMemoryNode(state);

    expect(conversationMemory.saveMessages).toHaveBeenCalledTimes(1);
    expect(generateSessionTitle).toHaveBeenCalledWith("分析这份报表");
    expect(conversationMemory.updateSessionTitle).toHaveBeenCalledWith(
      "session-1",
      "报表分析"
    );
  });
});
