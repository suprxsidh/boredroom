import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMatchmaking } from '@/hooks/useMatchmaking'

// Mock supabase
const mockTrack = vi.fn().mockResolvedValue(undefined)
const mockUnsubscribe = vi.fn()
const mockSend = vi.fn()
const mockSubscribe = vi.fn((cb: (s: string) => void) => {
  cb('SUBSCRIBED')
  return { unsubscribe: mockUnsubscribe }
})

let presenceSyncHandler: (() => void) | null = null
let broadcastHandler: ((p: { payload: unknown }) => void) | null = null

const mockChannel = {
  on: vi.fn((type: string, opts: { event: string }, handler: (...args: unknown[]) => void) => {
    if (type === 'presence' && opts.event === 'sync') presenceSyncHandler = handler as () => void
    if (type === 'broadcast' && opts.event === 'signal')
      broadcastHandler = handler as (p: { payload: unknown }) => void
    return mockChannel
  }),
  track: mockTrack,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
  send: mockSend,
  presenceState: vi.fn().mockReturnValue({}),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  presenceSyncHandler = null
  broadcastHandler = null
  mockChannel.presenceState.mockReturnValue({})
  mockSubscribe.mockImplementation((cb: (s: string) => void) => {
    cb('SUBSCRIBED')
    return { unsubscribe: mockUnsubscribe }
  })
  mockChannel.on.mockImplementation(
    (type: string, opts: { event: string }, handler: (...args: unknown[]) => void) => {
      if (type === 'presence' && opts.event === 'sync') presenceSyncHandler = handler as () => void
      if (type === 'broadcast' && opts.event === 'signal')
        broadcastHandler = handler as (p: { payload: unknown }) => void
      return mockChannel
    }
  )
})

describe('useMatchmaking', () => {
  it('starts in idle status', () => {
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal: vi.fn(), onMatched: vi.fn() })
    )
    expect(result.current.status).toBe('idle')
  })

  it('moves to waiting on start()', async () => {
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal: vi.fn(), onMatched: vi.fn() })
    )
    await act(async () => { result.current.start() })
    expect(result.current.status).toBe('waiting')
  })

  it('calls onMatched with correct initiator when 2 users present', async () => {
    const onMatched = vi.fn()
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal: vi.fn(), onMatched })
    )

    await act(async () => { result.current.start() })

    const myId = result.current.userId
    const otherId = 'other-user-id'

    // Simulate presence sync with 2 users — my user joined earlier (lower joinedAt = initiator)
    mockChannel.presenceState.mockReturnValue({
      [myId]: [{ userId: myId, joinedAt: 1000 }],
      [otherId]: [{ userId: otherId, joinedAt: 2000 }],
    })

    await act(async () => { presenceSyncHandler?.() })

    expect(onMatched).toHaveBeenCalledWith(otherId, true)
  })

  it('routes incoming signal to onSignal when addressed to this user', async () => {
    const onSignal = vi.fn()
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal, onMatched: vi.fn() })
    )

    await act(async () => { result.current.start() })

    const myId = result.current.userId
    const msg = { type: 'offer', from: 'peer', to: myId, payload: '{}' }

    await act(async () => { broadcastHandler?.({ payload: msg }) })

    expect(onSignal).toHaveBeenCalledWith(msg)
  })

  it('ignores signals addressed to other users', async () => {
    const onSignal = vi.fn()
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal, onMatched: vi.fn() })
    )

    await act(async () => { result.current.start() })

    const msg = { type: 'offer', from: 'peer', to: 'someone-else', payload: '{}' }

    await act(async () => { broadcastHandler?.({ payload: msg }) })

    expect(onSignal).not.toHaveBeenCalled()
  })

  it('sendSignal broadcasts via channel', async () => {
    const { result } = renderHook(() =>
      useMatchmaking({ onSignal: vi.fn(), onMatched: vi.fn() })
    )

    await act(async () => { result.current.start() })

    const msg = { type: 'offer' as const, from: 'me', to: 'peer', payload: '{}' }
    result.current.sendSignal(msg)

    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'signal',
      payload: msg,
    })
  })
})
