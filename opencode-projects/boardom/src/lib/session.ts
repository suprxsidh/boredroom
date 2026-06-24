import type SimplePeer from 'simple-peer'

interface Session {
  peer: SimplePeer.Instance | null
  userId: string
  isInitiator: boolean
}

const _session: Session = {
  peer: null,
  userId: '',
  isInitiator: false,
}

export function setSession(data: Partial<Session>): void {
  Object.assign(_session, data)
}

export function getSession(): Session {
  return _session
}

export function clearSession(): void {
  _session.peer?.destroy()
  _session.peer = null
  _session.userId = ''
  _session.isInitiator = false
}
