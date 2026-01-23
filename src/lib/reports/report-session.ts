import { conversationMemory } from '@/lib/memory/conversation-memory';
import { encodeReportMessage } from '@/lib/reports/report-message';
import type { ReportContent } from '@/types/report';

type ReportSessionInput = {
  ownerId: string;
  ownerType: 'admin' | 'user' | 'guest';
  report: ReportContent;
};

function buildUserPrompt(report: ReportContent): string {
  const comparison = report.comparisonYear
    ? `，对比${report.comparisonYear}年度`
    : '';
  return `生成${report.year}年度财务分析报告${comparison}`;
}

export async function createReportConversationSession(
  input: ReportSessionInput
): Promise<string> {
  const { ownerId, ownerType, report } = input;

  const sessionId = await conversationMemory.createSession(
    'unified',
    {
      source: 'report',
      year: report.year,
      comparisonYear: report.comparisonYear ?? null,
      reportTitle: report.title,
    },
    ownerId,
    ownerType
  );

  const userMessage = buildUserPrompt(report);
  const assistantMessage = encodeReportMessage(report);

  await conversationMemory.saveMessages(sessionId, [
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
  ]);

  const title = report.title?.trim() || userMessage;
  if (title) {
    await conversationMemory.updateSessionTitle(sessionId, title);
  }

  return sessionId;
}
