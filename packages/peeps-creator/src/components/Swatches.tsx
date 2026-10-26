import { useId } from 'react'
import { icons } from './icons.tsx'

/** A row of colour dots and a picker. `transparent` adds a "no colour" dot first (a checkerboard with a slash). */
export function Swatches({ label, value, options, onChange, transparent = false }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void; transparent?: boolean }) {
  const id = useId()
  const Clear = icons.clear
  const isClear = value.toLowerCase() === 'transparent'
  return (
    <div className="pc-field">
      <span className="pc-label" id={id}>{label}</span>
      <div className="pc-swatches" role="group" aria-labelledby={id}>
        {transparent && <button className="pc-swatch pc-clear" aria-label={`${label}: transparent`} aria-pressed={isClear} onClick={() => onChange('transparent')}><Clear /></button>}
        {options.map((o) => <button key={o} className="pc-swatch" style={{ background: o }} aria-label={`${label} ${o}`} aria-pressed={o.toLowerCase() === value.toLowerCase()} onClick={() => onChange(o)} />)}
        <label className="pc-swatch pc-custom" aria-label={`${label}: pick a colour`}>
          <input type="color" value={isClear ? '#ffffff' : value} onChange={(e) => onChange(e.target.value)} />
        </label>
      </div>
    </div>
  )
}
