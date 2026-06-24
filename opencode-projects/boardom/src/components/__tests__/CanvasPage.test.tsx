import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const { mockPush, mockClearSession, mockApplyRemoteData, sessionState } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockClearSession: vi.fn(),
  mockApplyRemoteData: vi.fn(),
  sessionState: { peer: null as any },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

vi.mock('@/hooks/useCanvasSync', () => ({
  useCanvasSync: vi.fn(() => ({ applyRemoteData: mockApplyRemoteData })),
}))

const mockEditor = {
  store: { listen: vi.fn(() => () => {}), put: vi.fn(), remove: vi.fn(), mergeRemoteChanges: vi.fn() },
  inputs: { currentPagePoint: { x: 0, y: 0 } },
  getCurrentPageId: vi.fn(() => 'page:page'),
}

vi.mock('tldraw', () => ({
  Tldraw: ({ onMount }: any) => { onMount?.(mockEditor); return null },
  Editor: class {},
}))

vi.mock('@/components/canvas/DrawingToolbar', () => ({
  default: () => <aside data-testid="drawing-toolbar" />,
}))

vi.mock('@/components/canvas/StickerPanel', () => ({
  default: () => <aside data-testid="sticker-panel" />,
}))

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(() => ({ peer: sessionState.peer, userId: 'u1', isInitiator: true })),
  clearSession: mockClearSession,
}))

// suppress tldraw.css import
vi.mock('tldraw/tldraw.css', () => ({}))

import CanvasPage from '@/components/canvas/CanvasPage'

describe('CanvasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionState.peer = null
  })

  it('redirects to / when no peer in session', () => {
    sessionState.peer = null
    render(<CanvasPage />)
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('renders canvas layout with Leave button when peer exists', () => {
    sessionState.peer = {
      connected: true,
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
    render(<CanvasPage />)
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument()
  })

  it('Leave button clears session and navigates to /', () => {
    sessionState.peer = {
      connected: true,
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
    render(<CanvasPage />)
    fireEvent.click(screen.getByRole('button', { name: /leave/i }))
    expect(mockClearSession).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows partner-left state and Start again button when peer closes', () => {
    let closeHandler: (() => void) | null = null
    sessionState.peer = {
      connected: true,
      send: vi.fn(),
      on: vi.fn((event: string, handler: any) => {
        if (event === 'close') closeHandler = handler
      }),
      removeListener: vi.fn(),
    }
    render(<CanvasPage />)
    expect(closeHandler).not.toBeNull()
    act(() => { closeHandler!() })
    expect(screen.getByText(/your partner left/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start again/i })).toBeInTheDocument()
  })

  it('Start again clears session and navigates to /', () => {
    let closeHandler: (() => void) | null = null
    sessionState.peer = {
      connected: true,
      send: vi.fn(),
      on: vi.fn((event: string, handler: any) => {
        if (event === 'close') closeHandler = handler
      }),
      removeListener: vi.fn(),
    }
    render(<CanvasPage />)
    act(() => { closeHandler!() })
    fireEvent.click(screen.getByRole('button', { name: /start again/i }))
    expect(mockClearSession).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
