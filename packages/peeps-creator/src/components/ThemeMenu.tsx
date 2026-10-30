import { useEffect, useRef } from 'react'
import { menu } from '@kit/ui'
import { themes, type ThemeId } from '../types.ts'
import { icons } from './icons.tsx'

/** The theme switch: a @kit/ui menu (Down, Enter or Space opens; arrows, Home, End and typeahead move; Esc or a click outside closes;
 *  focus comes back to the button). The menu floats in the top layer, so no panel cuts it off. */
export function ThemeMenu({ theme, onChange }: { theme: ThemeId; onChange: (t: ThemeId) => void }) {
  const button = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null), pick = useRef(onChange)
  pick.current = onChange
  useEffect(() => {
    const m = menu(button.current!, list.current!, { align: 'start', onSelect: (item) => pick.current(item.dataset.theme as ThemeId) })
    return () => m.destroy()
  }, [])
  const Sun = icons.theme
  const current = themes.find((t) => t.id === theme) ?? themes[0]
  return (
    <div className="pc-theme">
      <button ref={button} type="button" className="k-btn" data-testid="pc-theme-button"><Sun /><span>{current.label}</span></button>
      <div ref={list} className="k-menu">
        {themes.map((t) => (
          <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === theme} className="pc-item" data-theme={t.id}>
            <i style={{ background: t.dot }} />{t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
