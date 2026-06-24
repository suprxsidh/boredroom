'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate'
  from: string
  to: string
  payload: string
}

export type MatchmakingStatus = 'idle' | 'waiting' | 'matched' | 'timeout'

interface PresenceUser {
  userId: string
  joinedAt: number
}

interface UseMatchmakingOptions {
  onSignal: (msg: SignalingMessage) => void
  onMatched: (peerId: string, isInitiator: boolean) => void
}

export function useMatchmaking({ onSignal, onMatched }: UseMatchmakingOptions) {
  const [status, setStatus] = useState<MatchmakingStatus>('idle')
  const [userId, setUserId] = useState('')
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matchedRef = useRef(false)

  // Keep stable refs to callbacks so closures always use latest values
  const onSignalRef = useRef(onSignal)
  const onMatchedRef = useRef(onMatched)
  useEffect(() => { onSignalRef.current = onSignal }, [onSignal])
  useEffect(() => { onMatchedRef.current = onMatched }, [onMatched])

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    channelRef.current?.unsubscribe()
    channelRef.current = null
    matchedRef.current = false
    setStatus('idle')
  }, [])

  const start = useCallback(() => {
    const newUserId = crypto.randomUUID()
    setUserId(newUserId)
    matchedRef.current = false
    setStatus('waiting')

    const channel = supabase.channel('lobby', {
      config: { presence: { key: newUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        if (matchedRef.current) return

        const state = channel.presenceState<PresenceUser>()
        const keys = Object.keys(state)

        if (keys.length < 2) return

        // Collect all users with their joinedAt values
        const users = keys.flatMap((key) =>
          state[key].map((u) => ({ userId: u.userId, joinedAt: u.joinedAt }))
        )

        // Find this user's entry
        const me = users.find((u) => u.userId === newUserId)
        if (!me) return

        // Find a peer (any other user)
        const peer = users.find((u) => u.userId !== newUserId)
        if (!peer) return

        matchedRef.current = true
        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        // Initiator = user who joined earlier (lower joinedAt); tie-break by UUID sort
        const isInitiator =
          me.joinedAt < peer.joinedAt ||
          (me.joinedAt === peer.joinedAt && me.userId < peer.userId)

        setStatus('matched')
        onMatchedRef.current(peer.userId, isInitiator)
        channel.unsubscribe()
        channelRef.current = null
      })
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: SignalingMessage }) => {
        if (payload.to === newUserId) onSignalRef.current(payload)
      })
      .subscribe(async (s) => {
        if (s === 'SUBSCRIBED') {
          await channel.track({ userId: newUserId, joinedAt: Date.now() })
        }
      })

    channelRef.current = channel

    timeoutRef.current = setTimeout(() => {
      if (!matchedRef.current) {
        setStatus('timeout')
        timeoutRef.current = null
        channel.unsubscribe()
        channelRef.current = null
      }
    }, 60_000)
  }, [])

  const sendSignal = useCallback((msg: SignalingMessage) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: msg })
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      channelRef.current?.unsubscribe()
    }
  }, [])

  return { status, userId, start, cancel, sendSignal }
}
