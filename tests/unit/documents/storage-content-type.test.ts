/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { getContentType } from '@/lib/documents/storage';

describe('storage content types', () => {
  it('returns text/markdown for .md files', () => {
    expect(getContentType('policy.md')).toBe('text/markdown');
  });
});
