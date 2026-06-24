'use client'

import type { Editor } from 'tldraw'

interface Props {
  editor: Editor | null
}

export default function StickerPanel({ editor: _editor }: Props) {
  return <aside className="w-64 bg-neutral-900" />
}
