import { useEffect, useRef } from 'react'
import { menu } from '@kit/ui'
import { icons } from './icons.tsx'

export interface PhotoAction { label: string; onSelect: () => void }

const TITLE = 'Make a peep from a photo of one person. It is sent to an AI model to read and is not kept; the peep is drawn from what it sees.'

/** From photo: a plain button, or, when the host adds actions (its own key), a @kit/ui menu like the theme switch: "Choose a photo…" first,
 *  then the host's actions. No row of its own under the toolbar, so the creator keeps its height. */
export function PhotoMenu({ busy, disabled, onChoose, actions = [] }: { busy: boolean; disabled: boolean; onChoose: () => void; actions?: PhotoAction[] }) {
  const button = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null)
  const latest = useRef({ onChoose, actions })
  latest.current = { onChoose, actions }
  const withMenu = actions.length > 0
  useEffect(() => {
    if (!withMenu) return
    const m = menu(button.current!, list.current!, { align: 'start', onSelect: (item) => {
      const i = Number(item.dataset.action)
      if (i < 0) latest.current.onChoose(); else latest.current.actions[i]?.onSelect()
    } })
    return () => m.destroy()
  }, [withMenu])
  const I = icons.photo
  // aria-disabled while busy, not disabled, so the focus stays on the button
  const props = { className: 'k-btn', 'aria-label': 'From photo', 'aria-busy': busy || undefined, 'aria-disabled': busy || undefined, disabled, title: TITLE }
  if (!withMenu) return <button type="button" {...props} onClick={() => !busy && onChoose()}><I /><span>From photo</span></button>
  return (
    <div className="pc-theme">
      <button ref={button} type="button" {...props} onClickCapture={(e) => { if (busy) { e.preventDefault(); e.stopPropagation() } }}><I /><span>From photo</span></button>
      <div ref={list} className="k-menu">
        <button type="button" role="menuitem" className="pc-item" data-action="-1">Choose a photo…</button>
        {actions.map((a, i) => <button key={a.label} type="button" role="menuitem" className="pc-item" data-action={i}>{a.label}</button>)}
      </div>
    </div>
  )
}
