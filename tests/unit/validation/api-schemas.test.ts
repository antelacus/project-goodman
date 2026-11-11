/**
 * Unit Tests for API Validation Schemas
 *
 * Tests the Zod schemas in src/lib/validation/api-schemas.ts
 */

import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  ChatMessageSchema,
  SessionIdParamSchema,
  VALIDATION_LIMITS,
  validateRequest,
  parseRequest,
} from '@/lib/validation/api-schemas';

describe('VALIDATION_LIMITS constants', () => {
  it('should have expected limits defined', () => {
    expect(VALIDATION_LIMITS.MAX_QUESTION_LENGTH).toBe(2000);
    expect(VALIDATION_LIMITS.MAX_MESSAGES_COUNT).toBe(10);
    expect(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH).toBe(128);
  });
});

describe('LoginSchema', () => {
  it('should accept valid login credentials', () => {
    const result = LoginSchema.safeParse({
      username: 'admin',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty username', () => {
    const result = LoginSchema.safeParse({
      username: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('用户名不能为空');
    }
  });

  it('should reject empty password', () => {
    const result = LoginSchema.safeParse({
      username: 'admin',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject username exceeding max length', () => {
    const longUsername = 'a'.repeat(VALIDATION_LIMITS.MAX_USERNAME_LENGTH + 1);
    const result = LoginSchema.safeParse({
      username: longUsername,
      password: 'password',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('用户名长度不能超过');
    }
  });
});

describe('ChatMessageSchema', () => {
  describe('question field', () => {
    it('should accept valid question', () => {
      const result = ChatMessageSchema.safeParse({
        question: '请计算流动比率',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty question', () => {
      const result = ChatMessageSchema.safeParse({
        question: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('问题不能为空');
      }
    });

    it('should reject question exceeding max length', () => {
      const longQuestion = 'a'.repeat(VALIDATION_LIMITS.MAX_QUESTION_LENGTH + 1);
      const result = ChatMessageSchema.safeParse({
        question: longQuestion,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('问题长度不能超过');
      }
    });
  });

  describe('sessionId field', () => {
    it('should accept valid UUID sessionId', () => {
      const result = ChatMessageSchema.safeParse({
        question: '测试问题',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept missing sessionId (optional)', () => {
      const result = ChatMessageSchema.safeParse({
        question: '测试问题',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID sessionId', () => {
      const result = ChatMessageSchema.safeParse({
        question: '测试问题',
        sessionId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('documentIds field', () => {
    it('should accept valid document IDs array', () => {
      const result = ChatMessageSchema.safeParse({
        question: '分析文档',
        documentIds: [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty document IDs array', () => {
      const result = ChatMessageSchema.safeParse({
        question: '分析文档',
        documentIds: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject too many document IDs', () => {
      const tooManyIds = Array.from({ length: VALIDATION_LIMITS.MAX_DOCUMENT_IDS + 1 }, (_, i) =>
        `550e8400-e29b-41d4-a716-44665544000${i}`
      );
      const result = ChatMessageSchema.safeParse({
        question: '分析文档',
        documentIds: tooManyIds,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID in document IDs', () => {
      const result = ChatMessageSchema.safeParse({
        question: '分析文档',
        documentIds: ['valid-uuid-here', 'invalid-uuid'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('files field', () => {
    it('should accept valid files array', () => {
      const result = ChatMessageSchema.safeParse({
        question: '分析文件',
        files: ['file1.pdf', 'file2.xlsx'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject more than 5 files', () => {
      const result = ChatMessageSchema.safeParse({
        question: '分析文件',
        files: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('最多上传5个文件');
      }
    });
  });
});

describe('validateRequest helper', () => {
  it('should return success for valid data', () => {
    const result = validateRequest(LoginSchema, { username: 'admin', password: 'test123' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ username: 'admin', password: 'test123' });
    expect(result.error).toBeUndefined();
  });

  it('should return error for invalid data', () => {
    const result = validateRequest(LoginSchema, { username: 'admin', password: '' });
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('密码不能为空');
  });

  it('should join multiple error messages', () => {
    const result = validateRequest(LoginSchema, { username: '', password: '' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('用户名不能为空');
  });
});

describe('parseRequest helper', () => {
  it('should return parsed data for valid input', () => {
    const data = parseRequest(LoginSchema, { username: 'admin', password: 'valid' });
    expect(data).toEqual({ username: 'admin', password: 'valid' });
  });

  it('should throw Error for invalid input', () => {
    expect(() => {
      parseRequest(LoginSchema, { username: 'admin', password: '' });
    }).toThrow('密码不能为空');
  });
});

describe('uuid inputs', () => {
  it('are lowercased, since ids are compared as strings against the database form', () => {
    expect(SessionIdParamSchema.parse('550E8400-E29B-41D4-A716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(ChatMessageSchema.parse({ question: 'q', documentIds: ['550E8400-E29B-41D4-A716-446655440000'] }).documentIds).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
  });
});
