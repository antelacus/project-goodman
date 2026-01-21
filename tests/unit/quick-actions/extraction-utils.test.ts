import { describe, it, expect } from 'vitest';
import { formatExtractionValue } from '@/components/quick-actions/extraction-utils';

describe('formatExtractionValue', () => {
  it('returns strings for primitive values', () => {
    expect(formatExtractionValue('foo')).toBe('foo');
    expect(formatExtractionValue(123)).toBe('123');
    expect(formatExtractionValue(true)).toBe('true');
  });

  it('stringifies objects and arrays', () => {
    expect(formatExtractionValue({ foo: 'bar' })).toBe('{"foo":"bar"}');
    expect(formatExtractionValue([1, 'a'])).toBe('[1,"a"]');
  });

  it('handles nullish values', () => {
    expect(formatExtractionValue(null)).toBe('无');
    expect(formatExtractionValue(undefined)).toBe('无');
  });
});
