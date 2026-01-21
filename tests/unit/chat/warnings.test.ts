import { describe, it, expect } from 'vitest';
import { formatChatWarnings } from '@/lib/chat/warnings';

describe('formatChatWarnings', () => {
  it('returns null when warnings are empty', () => {
    expect(formatChatWarnings()).toBeNull();
    expect(formatChatWarnings([])).toBeNull();
  });

  it('formats unique warning messages with a prefix', () => {
    const message = formatChatWarnings([
      { type: 'RETRIEVAL_EMPTY', message: '未找到相关数据' },
      { type: 'RETRIEVAL_EMPTY', message: '未找到相关数据' },
      { type: 'RETRIEVAL_FAILED', message: '检索暂时失败' },
    ]);

    expect(message).toBe('提示：未找到相关数据；检索暂时失败');
  });
});
