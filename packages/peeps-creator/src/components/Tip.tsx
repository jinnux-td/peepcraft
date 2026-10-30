import { useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'

/** One tooltip for every `[data-tip]` inside the creator (colour dots, items), drawn on the page body at fixed place, so it never makes a
 *  scrolling list longer or gets cut by a panel. Under the element, kept inside the window; a list (names in full) shows none. */
export function useTip() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const show = (target: EventTarget) => {
    const el = (target as Element).closest?.('[data-tip]')
    if (!el || el.closest('.pc-list')) { setTip(null); return }
    const r = el.getBoundingClientRect()
    setTip({ text: el.getAttribute('data-tip')!, x: r.left + r.width / 2, y: r.bottom + 9 })
  }
  useLayoutEffect(() => {
    const b = box.current
    if (!b || !tip) return
    const w = b.offsetWidth, left = Math.min(Math.max(tip.x - w / 2, 8), innerWidth - w - 8)
    b.style.left = `${left}px`; b.style.setProperty('--pc-tip-arrow', `${tip.x - left}px`)
  }, [tip])
  const hide = () => setTip(null)
  return {
    handlers: { onPointerOver: (e: PointerEvent) => show(e.target), onPointerLeave: hide, onFocus: (e: FocusEvent) => show(e.target), onBlur: hide, onScrollCapture: hide, onPointerDown: hide },
    node: tip && createPortal(<div ref={box} className="k-tip pc-tip" role="tooltip" style={{ top: tip.y, left: tip.x }}>{tip.text}</div>, document.body),
  }
}
