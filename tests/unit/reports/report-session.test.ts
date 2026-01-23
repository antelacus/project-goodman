/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReportConversationSession } from "@/lib/reports/report-session";
import { REPORT_MESSAGE_PREFIX } from "@/lib/reports/report-message";
import { conversationMemory } from "@/lib/memory/conversation-memory";
import type { ReportContent } from "@/types/report";

vi.mock("@/lib/memory/conversation-memory", () => ({
  conversationMemory: {
    createSession: vi.fn(),
    saveMessages: vi.fn(),
    updateSessionTitle: vi.fn(),
  },
}));

describe("createReportConversationSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session and stores report messages", async () => {
    const report: ReportContent = {
      title: "2024年度财务综合分析报告",
      generatedAt: "2026-01-01T00:00:00.000Z",
      year: "2024",
      comparisonYear: "2023",
      sections: [],
      summary: {
        keyFindings: [],
        riskWarnings: [],
        recommendations: [],
      },
    };

    vi.mocked(conversationMemory.createSession).mockResolvedValue("session-123");
    vi.mocked(conversationMemory.saveMessages).mockResolvedValue(undefined);
    vi.mocked(conversationMemory.updateSessionTitle).mockResolvedValue(undefined);

    const sessionId = await createReportConversationSession({
      ownerId: "owner-1",
      ownerType: "user",
      report,
    });

    expect(sessionId).toBe("session-123");
    expect(conversationMemory.createSession).toHaveBeenCalledTimes(1);
    expect(conversationMemory.saveMessages).toHaveBeenCalledTimes(1);
    expect(conversationMemory.updateSessionTitle).toHaveBeenCalledWith(
      "session-123",
      report.title
    );

    const savedMessages = vi.mocked(conversationMemory.saveMessages).mock.calls[0]?.[1];
    expect(savedMessages?.[0]?.content).toContain("生成2024年度财务分析报告");
    expect(savedMessages?.[1]?.content.startsWith(REPORT_MESSAGE_PREFIX)).toBe(true);
  });
});
