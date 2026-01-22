import { describe, it, expect } from 'vitest';
import { PDF_ONLY_TYPES } from '@/lib/documents/constants';

describe('document constants', () => {
  it('treats 业务情况 as non-PDF-only', () => {
    expect(PDF_ONLY_TYPES).not.toContain('business_info');
  });
});
