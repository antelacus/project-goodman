import { describe, it, expect } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string assertions', () => {
    expect('hello').toContain('ell')
  })

  it('should handle array assertions', () => {
    const items = ['a', 'b', 'c']
    expect(items).toHaveLength(3)
    expect(items).toContain('b')
  })
})
