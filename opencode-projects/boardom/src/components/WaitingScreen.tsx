'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SimplePeer from 'simple-peer'
import { useMatchmaking, SignalingMessage } from '@/hooks/useMatchmaking'
import { setSession } from '@/lib/session'

export default function WaitingScreen() {
  const router = useRouter()
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const peerIdRef = useRef('')
  const isInitiatorRef = useRef(false)

  const { status, userId, start, cancel, sendSignal } = useMatchmaking({
    onMatched(peerId, isInitiator) {
      peerIdRef.current = peerId
      isInitiatorRef.current = isInitiator

      const peer = new SimplePeer({ initiator: isInitiator, trickle: true })
      peerRef.current = peer

      peer.on('signal', (signal) => {
        sendSignal({
          type: signal.type === 'offer' ? 'offer'
            : signal.type === 'answer' ? 'answer'
            : 'ice-candidate',
          from: userId,
          to: peerId,
          payload: JSON.stringify(signal),
        })
      })

      peer.on('connect', () => {
        setSession({ peer, userId, isInitiator })
        router.push('/canvas')
      })

      peer.on('error', () => router.push('/'))
    },
    onSignal(msg: SignalingMessage) {
      peerRef.current?.signal(JSON.parse(msg.payload))
    },
  })

  useEffect(() => {
    start()
    return () => { peerRef.current?.destroy() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCancel() {
    cancel()
    peerRef.current?.destroy()
    router.push('/')
  }

  if (status === 'timeout') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 text-white">
        <p className="text-neutral-400">No one around right now.</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-white text-black rounded-full text-sm font-medium"
        >
          Try again
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 text-white">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-white rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-neutral-300">Finding someone...</p>
      <button
        onClick={handleCancel}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        Cancel
      </button>
    </main>
  )
}
