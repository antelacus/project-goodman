/**
 * Unit Tests for Utility Functions
 *
 * Tests the utility functions in src/lib/utils.ts
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (classnames utility)', () => {
  describe('basic string merging', () => {
    it('should merge multiple class strings', () => {
      expect(cn('a', 'b', 'c')).toBe('a b c');
    });

    it('should handle single class string', () => {
      expect(cn('single-class')).toBe('single-class');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  describe('conditional classes', () => {
    it('should filter out falsy values', () => {
      expect(cn('a', false && 'b', 'c')).toBe('a c');
      expect(cn('a', null, 'b')).toBe('a b');
      expect(cn('a', undefined, 'b')).toBe('a b');
    });

    it('should handle boolean conditions', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
    });
  });

  describe('Tailwind class merging', () => {
    it('should merge conflicting Tailwind classes (later wins)', () => {
      // tailwind-merge resolves conflicts by keeping the last occurrence
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should preserve non-conflicting classes', () => {
      expect(cn('p-4', 'm-2')).toBe('p-4 m-2');
      expect(cn('text-sm', 'font-bold', 'text-blue-500')).toBe('text-sm font-bold text-blue-500');
    });

    it('should handle responsive and state variants', () => {
      expect(cn('hover:bg-blue-500', 'hover:bg-red-500')).toBe('hover:bg-red-500');
      expect(cn('md:p-4', 'lg:p-8')).toBe('md:p-4 lg:p-8');
    });
  });

  describe('object syntax', () => {
    it('should handle object with boolean values', () => {
      expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe('text-red-500');
    });

    it('should mix objects and strings', () => {
      expect(cn('base-class', { active: true, disabled: false })).toBe('base-class active');
    });
  });

  describe('array syntax', () => {
    it('should handle arrays of classes', () => {
      expect(cn(['a', 'b', 'c'])).toBe('a b c');
    });

    it('should handle nested arrays', () => {
      expect(cn(['a', ['b', 'c']])).toBe('a b c');
    });
  });

  describe('real-world usage patterns', () => {
    it('should handle component styling pattern', () => {
      const variant = 'primary';
      const size = 'lg';
      const className = 'custom-override';

      const result = cn(
        'base-button',
        variant === 'primary' && 'bg-yellow-400 text-black',
        variant === 'secondary' && 'bg-gray-200 text-gray-800',
        size === 'sm' && 'px-2 py-1 text-sm',
        size === 'lg' && 'px-6 py-3 text-lg',
        className
      );

      expect(result).toBe('base-button bg-yellow-400 text-black px-6 py-3 text-lg custom-override');
    });

    it('should handle disabled state pattern', () => {
      const isDisabled = true;
      const result = cn(
        'button bg-blue-500 text-white',
        isDisabled && 'opacity-50 cursor-not-allowed bg-gray-300'
      );

      // bg-gray-300 should override bg-blue-500
      expect(result).toBe('button text-white opacity-50 cursor-not-allowed bg-gray-300');
    });
  });
});
