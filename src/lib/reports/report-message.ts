import type { ReportContent } from '@/types/report';

const REPORT_MESSAGE_PREFIX = '__REPORT__:';

export function encodeReportMessage(report: ReportContent): string {
  return `${REPORT_MESSAGE_PREFIX}${JSON.stringify(report)}`;
}

export function decodeReportMessage(content: string): ReportContent | null {
  if (!content.startsWith(REPORT_MESSAGE_PREFIX)) {
    return null;
  }

  const raw = content.slice(REPORT_MESSAGE_PREFIX.length);
  try {
    return JSON.parse(raw) as ReportContent;
  } catch {
    return null;
  }
}

export { REPORT_MESSAGE_PREFIX };
