import { useId, useState, type ReactNode } from 'react'
import { toHex, swatches } from '@kit/peeps-engine'
import { icons } from './icons.tsx'

/** A colour name the browser knows ("blue", "tomato") as #rrggbb; null for anything else, or a see-through colour. */
function browserColor(name: string): string | null {
  if (typeof CSS === 'undefined' || !CSS.supports('color', name)) return null
  const c = document.createElement('canvas').getContext('2d')
  if (!c) return null
  c.fillStyle = name
  return /^#[0-9a-f]{6}$/i.test(c.fillStyle) ? c.fillStyle : null
}

/** A row of colour dots and a picker. `transparent` adds a "no colour" dot first (a checkerboard with a slash). "More colours" opens a box
 *  for a name or a hex, the colours already in the picture (`used`), and the full set. */
export function Swatches({ label, value, options, onChange, transparent = false, used = [], action }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void; transparent?: boolean; used?: readonly string[]
  /** A button beside the label (the lock of the background). */
  action?: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const I = icons
  const isClear = value.toLowerCase() === 'transparent'
  const dot = (o: string) => <button key={o} className="pc-swatch" data-tip={o} style={{ background: o }} aria-label={`${label} ${o}`} aria-pressed={o.toLowerCase() === value.toLowerCase()} onClick={() => onChange(o)} />
  const typed = toHex(text, browserColor)
  return (
    <div className="pc-field">
      <span className="pc-label"><span id={id}>{label}</span>{action}</span>
      <div className="pc-swatches" role="group" aria-labelledby={id}>
        {transparent && <button className="pc-swatch pc-clear" aria-label={`${label}: transparent`} aria-pressed={isClear} onClick={() => onChange('transparent')}><I.clear /></button>}
        {options.map(dot)}
        <label className="pc-swatch pc-custom" aria-label={`${label}: pick a colour`}>
          <input type="color" value={isClear ? '#ffffff' : value} onChange={(e) => onChange(e.target.value)} />
        </label>
        <button className="pc-swatch pc-more" aria-label={`${label}: more colours`} aria-expanded={open} aria-controls={`${id}more`} title="More colours" onClick={() => setOpen(!open)}><I.more /></button>
      </div>
      {open && (
        <div className="pc-palette" id={`${id}more`}>
          <div className="pc-hex">
            <input
              type="text" value={text} placeholder='Try "blue" or "#00c4cc"' aria-label={`${label}: colour name or hex`} aria-invalid={!!text.trim() && !typed}
              onChange={(e) => { setText(e.target.value); const c = toHex(e.target.value, browserColor); if (c) onChange(c) }}
            />
            <span className="pc-swatch" style={{ background: typed ?? (isClear ? 'transparent' : value) }} aria-hidden="true" />
          </div>
          {used.length > 0 && <><h4>In this design</h4><div className="pc-swatches pc-seven" role="group" aria-label={`${label}: in this design`}>{used.map(dot)}</div></>}
          <h4>Default colours</h4>
          <div className="pc-swatches pc-seven" role="group" aria-label={`${label}: default colours`}>{swatches.all.map(dot)}</div>
        </div>
      )}
    </div>
  )
}
