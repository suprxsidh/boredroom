import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WaitingScreen from '@/components/WaitingScreen'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockMatchmaking = {
  status: 'waiting' as const,
  userId: 'my-id',
  start: vi.fn(),
  cancel: vi.fn(),
  sendSignal: vi.fn(),
}
vi.mock('@/hooks/useMatchmaking', () => ({
  useMatchmaking: vi.fn(() => mockMatchmaking),
}))
vi.mock('simple-peer', () => ({ default: vi.fn() }))
vi.mock('@/lib/session', () => ({ setSession: vi.fn(), getSession: vi.fn(() => ({})) }))

describe('WaitingScreen', () => {
  it('shows finding message', () => {
    render(<WaitingScreen />)
    expect(screen.getByText(/finding someone/i)).toBeInTheDocument()
  })

  it('cancel button returns to landing', () => {
    render(<WaitingScreen />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockMatchmaking.cancel).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})
