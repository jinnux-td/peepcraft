import { useId, useState } from 'react'
import { icons } from './icons.tsx'

/** A slider with its number as an input (typed values are kept in range) and, with `reset`, a button back to that default, a mark at it on
 *  the track, and a pull towards it: a drag that ends near the default lands on it, and leaving it takes a little more pull. */
export function Slider({ label, value, min, max, step, unit = '', reset, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; reset?: number; onChange: (v: number) => void
}) {
  const id = useId()
  // While typing, the box shows what was typed ("1." on the way to "1.5"); the value itself is set on every keystroke that is a number.
  const [draft, setDraft] = useState<string | null>(null)
  const decimals = (String(step).split('.')[1] ?? '').length
  const shown = Number(value.toFixed(decimals))
  const Reset = icons.reset
  // Within 5 % of the track (and at least a step and a half) from the default, a drag gives the default.
  const snap = (v: number) => (reset !== undefined && Math.abs(v - reset) <= Math.max((max - min) * 0.05, step * 1.5) ? reset : v)
  const at = reset === undefined ? 0 : (reset - min) / (max - min)
  return (
    <div className="pc-slider">
      <span className="pc-label">
        <label htmlFor={id}>{label}</label>
        <span className="pc-value">
          <input
            type="number" inputMode="decimal" aria-label={`${label} value`} min={min} max={max} step={step} value={draft ?? shown}
            onChange={(e) => { setDraft(e.target.value); const v = e.target.valueAsNumber; if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v))) }}
            onBlur={() => setDraft(null)}
          />
          <span aria-hidden="true">{unit}</span>
          {reset !== undefined && (
            <button type="button" className="pc-reset" aria-label={`Reset ${label.toLowerCase()}`} title={`Back to ${reset}${unit}`} disabled={shown === reset} onClick={() => onChange(reset)}><Reset /></button>
          )}
        </span>
      </span>
      <span className="pc-track">
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(snap(Number(e.target.value)))} />
        {/* The thumb's centre runs from half a thumb in from each end, so the mark does too. */}
        {reset !== undefined && <i className="pc-tick" aria-hidden="true" style={{ left: `calc(${at * 100}% + ${(0.5 - at) * 16}px)` }} />}
      </span>
    </div>
  )
}
