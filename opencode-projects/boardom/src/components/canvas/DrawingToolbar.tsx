'use client'

import type { Editor } from 'tldraw'

interface Props {
  editor: Editor | null
}

export default function DrawingToolbar({ editor: _editor }: Props) {
  return <aside className="w-14 bg-neutral-900" />
}
