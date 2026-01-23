/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/reports/save/route";
import { ensureSession, validateCsrf } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/database";
import { generateAndSaveReportDocx } from "@/lib/reports";
import { getSignedFileUrl } from "@/lib/documents/storage";

vi.mock("@/lib/security", () => ({
  ensureSession: vi.fn(),
  generateRequestId: vi.fn(() => "req-1"),
  createErrorResponse: vi.fn((error: unknown) => {
    return Response.json({ error: String(error) }, { status: 500 });
  }),
  validateCsrf: vi.fn(() => true),
  createCsrfErrorResponse: vi.fn(() => {
    return Response.json({ error: "csrf" }, { status: 403 });
  }),
}));

vi.mock("@/lib/database", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/reports", () => ({
  generateAndSaveReportDocx: vi.fn(),
}));

vi.mock("@/lib/documents/storage", () => ({
  getSignedFileUrl: vi.fn(),
}));

describe("/api/reports/save fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries insert without docx_storage_path when schema cache is missing", async () => {
    vi.mocked(ensureSession).mockResolvedValue({
      session: { role: "admin", userId: "user-1", sessionId: "session-1" },
      isNewSession: false,
    });

    vi.mocked(validateCsrf).mockResolvedValue(true);

    const insertResponses = [
      {
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the docx_storage_path column of reports in the schema cache",
        },
      },
      { data: { id: "report-1" }, error: null },
    ];

    const insertSpy = vi.fn((payload) => {
      const response = insertResponses.shift();
      return {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
        _payload: payload,
      };
    });

    const fromSpy = vi.fn(() => ({
      insert: insertSpy,
    }));

    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: fromSpy,
    } as unknown as ReturnType<typeof createServerSupabaseClient>);

    vi.mocked(generateAndSaveReportDocx).mockResolvedValue("reports/report-1/report.docx");
    vi.mocked(getSignedFileUrl).mockResolvedValue("https://example.com/report.docx");

    const request = new Request("http://localhost/api/reports/save", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "token",
      },
      body: JSON.stringify({
        content: {
          title: "2024年度财务综合分析报告",
          generatedAt: "2026-01-01T00:00:00.000Z",
          year: "2024",
          sections: [],
          summary: { keyFindings: ["a"], riskWarnings: [], recommendations: [] },
        },
        year: "2024",
      }),
    });

    const response = await POST(request as unknown as never);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(insertSpy).toHaveBeenCalledTimes(2);
    const firstPayload = insertSpy.mock.calls[0]?.[0];
    const secondPayload = insertSpy.mock.calls[1]?.[0];
    expect(firstPayload).toHaveProperty("docx_storage_path", null);
    expect(secondPayload).not.toHaveProperty("docx_storage_path");
  });
});
