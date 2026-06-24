import { describe, it, expect, beforeEach } from 'vitest'
import { setSession, getSession, clearSession } from '@/lib/session'

describe('session', () => {
  beforeEach(() => clearSession())

  it('starts empty', () => {
    const s = getSession()
    expect(s.peer).toBeNull()
    expect(s.userId).toBe('')
    expect(s.isInitiator).toBe(false)
  })

  it('sets and reads session data', () => {
    setSession({ userId: 'abc-123', isInitiator: true })
    const s = getSession()
    expect(s.userId).toBe('abc-123')
    expect(s.isInitiator).toBe(true)
  })

  it('clears session data', () => {
    setSession({ userId: 'abc-123', isInitiator: true })
    clearSession()
    const s = getSession()
    expect(s.userId).toBe('')
    expect(s.isInitiator).toBe(false)
  })
})
