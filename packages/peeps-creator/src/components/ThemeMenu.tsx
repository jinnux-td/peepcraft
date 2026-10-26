import { useEffect, useRef, useState } from 'react'
import { themes, type ThemeId } from '../types.ts'
import { icons } from './icons.tsx'

export function ThemeMenu({ theme, onChange }: { theme: ThemeId; onChange: (t: ThemeId) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    addEventListener('pointerdown', away); addEventListener('keydown', esc)
    return () => { removeEventListener('pointerdown', away); removeEventListener('keydown', esc) }
  }, [open])
  const Sun = icons.theme
  const current = themes.find((t) => t.id === theme) ?? themes[0]
  return (
    <div className="pc-theme" ref={ref}>
      <button className="pc-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} data-testid="pc-theme-button"><Sun /><span>{current.label}</span></button>
      {open && (
        <div className="pc-menu" role="menu">
          {themes.map((t) => (
            <button key={t.id} role="menuitemradio" aria-checked={t.id === theme} className="pc-item" onClick={() => { onChange(t.id); setOpen(false) }}>
              <i style={{ background: t.dot }} />{t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
