'use client'

import dynamic from 'next/dynamic'

const CanvasPage = dynamic(() => import('@/components/canvas/CanvasPage'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-neutral-950" />
  ),
})

export default function CanvasRoute() {
  return <CanvasPage />
}
