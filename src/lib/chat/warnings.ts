export type ChatWarningType = 'RETRIEVAL_EMPTY' | 'RETRIEVAL_FAILED' | 'DOCUMENT_UNAVAILABLE';

export interface ChatWarning {
  type: ChatWarningType;
  message: string;
  tool?: string;
}

export function formatChatWarnings(warnings?: ChatWarning[]): string | null {
  if (!warnings || warnings.length === 0) return null;

  const uniqueMessages = Array.from(
    new Set(
      warnings
        .map((warning) => warning.message)
        .filter((message) => message)
    )
  );

  if (uniqueMessages.length === 0) return null;

  return `提示：${uniqueMessages.join('；')}`;
}
